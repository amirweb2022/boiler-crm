import { config } from "dotenv";
config({ path: ".env.local" });
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import { launchCertificateBrowser } from "../lib/certificates/browser";
import ExcelJS from "exceljs";
import { query } from "../lib/db/postgres";
import { COMPANIES_CATALOG } from "../lib/data/companies-catalog";
import { getCertificateFields } from "../lib/certificates/field-schema";
import { getTehranClock, isReminderSendTime, reminderDateRange } from "../lib/sms/reminder-policy";
import { nextYearShamsi, getCurrentShamsiYearMonth } from "../lib/date/shamsi";

// Credentials are supplied to this process, never stored in source or reports.
const run = `e2e-${randomUUID()}`;
const base = "http://localhost:3107";
const checks: Array<{ name: string; status: string; detail?: string }> = [];
const companies: string[] = [];
const objects = new Set<string>();
const actorIds: string[] = [];
const deviceIds: string[] = [];
const notificationIds: string[] = [];
const generatedIds: string[] = [];
let testerId: string | undefined;
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let server: ReturnType<typeof spawn> | undefined;
let reminderServer: ReturnType<typeof spawn> | undefined;
let storage: S3Client | undefined;
let adminCookie = "";
let testerCookie = "";
const bucket = process.env.LIARA_OBJECT_STORAGE_BUCKET!;

async function check(name: string, action: () => Promise<void>) {
  try { await action(); checks.push({ name, status: "passed" }); console.log(`PASS ${name}`); }
  catch (error: any) {
    let detail = String(error.message || error.code || error.name || "Error").split("\n")[0];
    for (const key of ["E2E_ADMIN_PASSWORD", "SESSION_SECRET", "CRON_SECRET", "LIARA_OBJECT_STORAGE_ACCESS_KEY", "LIARA_OBJECT_STORAGE_SECRET_KEY", "DATABASE_URL"]) {
      const secret = process.env[key]; if (secret) detail = detail.split(secret).join("<REDACTED>");
    }
    checks.push({ name, status: "failed", detail }); console.error(`FAIL ${name}: ${detail}`); throw error;
  }
}

async function api(url: string, method = "GET", body?: unknown, role: "admin" | "tester" | "public" = "admin", status = 200) {
  const cookie = role === "admin" ? adminCookie : role === "tester" ? testerCookie : "";
  const response = await fetch(base + url, {
    method, redirect: "manual", signal: AbortSignal.timeout(45000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, status, `${method} ${url.split("?")[0]} returned ${response.status}, expected ${status}`);
  return response;
}

async function testReminderDuringWindow(testRecordId: string, today: string) {
  const reminderBase = "http://localhost:3108";
  reminderServer = spawn(process.execPath, ["--require", path.resolve("scripts/e2e-clock.cjs"), path.resolve("node_modules/next/dist/bin/next"), "start", "-p", "3108"], {
    env: { ...process.env, SMS_PROVIDER: "mock", E2E_FIXED_NOW: `${today}T08:30:00Z` },
    stdio: "ignore", windowsHide: true,
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { ready = (await fetch(reminderBase + "/login")).ok; } catch { /* startup */ }
      if (ready) break;
      assert.equal(reminderServer.exitCode, null, "Controlled-clock server remains running");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, "Controlled-clock server starts");
    const login = await fetch(reminderBase + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: process.env.E2E_ADMIN_PHONE, password: process.env.E2E_ADMIN_PASSWORD }),
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(login.status, 200, "Controlled-clock admin login");
    const headers = { Cookie: login.headers.get("set-cookie")!.split(";")[0] };
    const send = () => fetch(`${reminderBase}/api/sms/reminders/${testRecordId}`, { method: "POST", headers, signal: AbortSignal.timeout(30000) });
    const simultaneous = await Promise.all([send(), send()]);
    assert.deepEqual(simultaneous.map((response) => response.status).sort(), [200, 409], "Concurrent reminders send exactly once");
    const success = await simultaneous.find((response) => response.status === 200)!.json();
    assert.equal(success.success, true); assert.match(success.providerRef, /^mock-/);
    assert.equal((await send()).status, 409, "A later duplicate is rejected too");
    const notification = await query("SELECT status,provider_ref FROM notifications WHERE test_record_id=$1 AND type='reminder'", [testRecordId]);
    assert.equal(notification.rows.length, 1); assert.equal(notification.rows[0].status, "sent");
    assert.match(notification.rows[0].provider_ref, /^mock-/);
    const list = await (await fetch(reminderBase + "/api/sms/reminders", { headers })).json();
    assert.ok(list.reminders.every((item: { testRecordId: string }) => item.testRecordId !== testRecordId), "Sent reminders disappear from the queue");
  } finally { reminderServer.kill(); reminderServer = undefined; }
}

async function main() {
  for (const key of ["DATABASE_URL", "LIARA_OBJECT_STORAGE_ENDPOINT", "LIARA_OBJECT_STORAGE_BUCKET", "LIARA_OBJECT_STORAGE_ACCESS_KEY", "LIARA_OBJECT_STORAGE_SECRET_KEY", "SESSION_SECRET", "CRON_SECRET", "NEXT_PUBLIC_APP_URL", "E2E_ADMIN_PHONE", "E2E_ADMIN_PASSWORD", "E2E_ADMIN_NAME"]) assert.ok(process.env[key], `${key} missing`);
  storage = new S3Client({ endpoint: process.env.LIARA_OBJECT_STORAGE_ENDPOINT, region: process.env.LIARA_OBJECT_STORAGE_REGION || "us-east-1", forcePathStyle: true, maxAttempts: 1, credentials: { accessKeyId: process.env.LIARA_OBJECT_STORAGE_ACCESS_KEY!, secretAccessKey: process.env.LIARA_OBJECT_STORAGE_SECRET_KEY! } });
  await check("Liara storage put/get/delete", async () => {
    const key = `certificates/${randomUUID()}.pdf`; objects.add(key);
    await storage!.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "%PDF-preflight", ContentType: "application/pdf" }), { abortSignal: AbortSignal.timeout(15000) });
    const stored = await storage!.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) });
    assert.equal(await stored.Body!.transformToString(), "%PDF-preflight");
    await storage!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) }); objects.delete(key);
  });
  await check("Liara database connection and schema", async () => {
    await query("SELECT 1");
    const tables = await query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (tables.rows.length === 0) await query(await readFile("database/schema.sql", "utf8"));
    await query("SELECT certificate_path FROM certificate_history LIMIT 0");
    await query("SELECT vessel_details FROM test_history LIMIT 0");
  });
  await check("Create or update retained admin", async () => {
    const hash = await bcrypt.hash(process.env.E2E_ADMIN_PASSWORD!, 12);
    const result = await query("INSERT INTO admins(phone,password_hash,full_name,role,is_active) VALUES($1,$2,$3,'admin',true) ON CONFLICT(phone) DO UPDATE SET password_hash=EXCLUDED.password_hash,full_name=EXCLUDED.full_name,role='admin',is_active=true RETURNING id", [process.env.E2E_ADMIN_PHONE, hash, process.env.E2E_ADMIN_NAME]);
    actorIds.push(result.rows[0].id);
    const phone = "09" + String(Date.now()).slice(-9);
    const tester = await query("INSERT INTO admins(phone,password_hash,full_name,role) VALUES($1,$2,$3,'tester') RETURNING id", [phone, hash, run]);
    testerId = tester.rows[0].id; actorIds.push(testerId!);
  });
  const tester = (await query("SELECT phone FROM admins WHERE id=$1", [testerId])).rows[0];
  server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", "3107"], { env: { ...process.env, SMS_PROVIDER: "mock" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let serverErrors = "";
  server.stderr?.on("data", (data) => { serverErrors = (serverErrors + data.toString()).slice(-3000); });
  await check("Production application starts", async () => {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(base + "/login")).ok) return; } catch { /* startup */ }
      if (server?.exitCode != null) throw new Error("Application exited before startup");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Application startup timed out");
  });
  await check("Admin and tester login, sessions and protected APIs", async () => {
    for (const [phone, role] of [[process.env.E2E_ADMIN_PHONE, "admin"], [tester.phone, "tester"]]) {
      const response = await api("/api/auth/login", "POST", { phone, password: process.env.E2E_ADMIN_PASSWORD }, "public");
      const cookie = response.headers.get("set-cookie")!.split(";")[0];
      if (role === "admin") adminCookie = cookie; else testerCookie = cookie;
    }
    assert.equal((await (await api("/api/auth/me")).json()).admin.role, "admin");
    await api("/api/companies", "GET", undefined, "public", 401);
    for (const url of ["/api/audit-logs", "/api/reports/status", "/api/certificates/fields?type=tank", "/api/sms/reminders"]) await api(url, "GET", undefined, "tester", 403);
    await api("/api/companies", "POST", {}, "tester", 403);
    for (let i = 0; i < 5; i++) await api("/api/auth/login", "POST", { phone: tester.phone, password: randomUUID() }, "public", 401);
    await api("/api/auth/login", "POST", { phone: tester.phone, password: process.env.E2E_ADMIN_PASSWORD }, "public", 429);
    await query("DELETE FROM login_attempts WHERE phone=$1", [tester.phone]);
  });
  let companyId = "";
  const devices: Array<{ id: string; type: string }> = [];
  const today = getTehranClock().date;
  const future = reminderDateRange(today).tomorrow;
  await check("Create company, edit, search, filters and pagination", async () => {
    const used = new Set((await query("SELECT catalog_code FROM companies")).rows.map((row) => row.catalog_code));
    const catalog = COMPANIES_CATALOG.find((entry) => !used.has(entry.code)); assert.ok(catalog, "No unused catalog company available");
    const result = await (await api("/api/companies", "POST", { catalogCode: catalog.code, phone: process.env.E2E_ADMIN_PHONE, contactName: run, province: run, city: "Test", address: run, testDate: future }, "admin", 201)).json();
    companyId = result.company.id; companies.push(companyId);
    await api(`/api/companies/${companyId}`, "PUT", { city: "Updated" });
    const list = await (await api(`/api/companies?province=${run}&proximity=due&pageSize=1`)).json(); assert.equal(list.total, 1); assert.equal(list.data[0].id, companyId);
    const empty = await (await api(`/api/companies?province=${run}&proximity=overdue&pageSize=1`)).json(); assert.equal(empty.total, 0);
    const secondPage = await (await api(`/api/companies?province=${run}&proximity=due&pageSize=1&page=2`)).json(); assert.equal(secondPage.total, 1); assert.equal(secondPage.data.length, 0);
    const search = await (await api(`/api/companies?search=${catalog.code}&province=${run}`)).json(); assert.equal(search.data[0].id, companyId);
    await api("/api/companies", "POST", { catalogCode: catalog.code, phone: process.env.E2E_ADMIN_PHONE, province: run, testDate: today }, "admin", 400);
    await api(`/api/companies/${companyId}`, "PUT", { testDate: "2026-02-30" }, "admin", 400);
    await api(`/api/test-records/${companyId}/mark-done`, "POST", undefined, "admin", 400);
  });
  await check("All five device types, edits, tester toggles, exclusions and validation", async () => {
    for (const type of ["tank", "boiler", "lift", "forklift", "grounding", "tank"]) {
      const input = type === "tank" || type === "boiler" ? { name: run, volume: "1000" } : { details: type === "lift" ? { liftType: "Test", capacityAndModel: "1000" } : type === "forklift" ? { forkliftType: "Test", capacity: "1000" } : { groundingSystemType: "Test", wellCount: 2 } };
      const result = await (await api("/api/vessels", "POST", { companyId, type, ...input }, "admin", 201)).json(); devices.push({ id: result.vessel.id, type }); deviceIds.push(result.vessel.id);
      await api(`/api/vessels/${result.vessel.id}`, "PUT", { type, ...input });
      await api(`/api/vessels/${result.vessel.id}/toggle`, "PATCH", { tested: true }, "tester", 400);
    }
    for (const device of devices) await api(`/api/vessels/${device.id}/exclude`, "PATCH", { excluded: true, reason: run });
    const early = new FormData(); early.set("file", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "early.pdf");
    await api(`/api/test-records/${companyId}/upload-certificate`, "POST", early, "admin", 400);
    for (const device of devices) await api(`/api/vessels/${device.id}/exclude`, "PATCH", { excluded: false });
    await api(`/api/companies/${companyId}`, "PUT", { testDate: today });
    for (const device of devices) await api(`/api/vessels/${device.id}/toggle`, "PATCH", { tested: true }, "tester");
    const excluded = devices[5];
    await api(`/api/vessels/${excluded.id}/exclude`, "PATCH", { excluded: true, reason: "bad" }, "admin", 400);
    await api(`/api/vessels/${excluded.id}/exclude`, "PATCH", { excluded: true, reason: run });
    await api(`/api/vessels/${excluded.id}/toggle`, "PATCH", { tested: true }, "tester", 400);
    await api(`/api/vessels/${excluded.id}/exclude`, "PATCH", { excluded: false });
    await api(`/api/vessels/${excluded.id}/toggle`, "PATCH", { tested: true });
    await api(`/api/vessels/${excluded.id}/exclude`, "PATCH", { excluded: true, reason: run });
    await api(`/api/test-records/${companyId}/mark-done`, "POST", undefined, "admin", 400);
  });
  let pdf = Buffer.alloc(0);
  await check("Generate tank and boiler PDFs without uploading", async () => {
    await api("/api/certificates/generate", "POST", { vesselId: devices[5].id, values: {} }, "admin", 400);
    for (const type of ["tank", "boiler"] as const) {
      const fields = await (await api(`/api/certificates/fields?type=${type}`)).json(); assert.ok(fields.fields.length);
      const values = Object.fromEntries(getCertificateFields(type).filter((field) => !field.auto).map((field) => [field.key, "10"]));
      const response = await api("/api/certificates/generate", "POST", { vesselId: devices.find((device) => device.type === type)!.id, values });
      pdf = Buffer.from(await response.arrayBuffer()); assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    }
    const record = (await query("SELECT certificate_uploaded FROM test_records WHERE company_id=$1", [companyId])).rows[0]; assert.equal(record.certificate_uploaded, false);
  });
  let sharePath = "";
  await check("Certificate upload, mock notification, public page and exact PDF bytes", async () => {
    const invalid = new FormData(); invalid.set("file", "not-a-file");
    await api(`/api/test-records/${companyId}/upload-certificate`, "POST", invalid, "admin", 400);
    const fake = new FormData(); fake.set("file", new Blob(["fake"], { type: "application/pdf" }), "fake.pdf");
    await api(`/api/test-records/${companyId}/upload-certificate`, "POST", fake, "admin", 400);
    const form = new FormData(); form.set("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), "test.pdf");
    const result = await (await api(`/api/test-records/${companyId}/upload-certificate`, "POST", form)).json(); assert.equal(result.sms.success, true);
    objects.add(result.testRecord.certificate_path);
    sharePath = new URL(result.testRecord.certificate_url).pathname;
    assert.match(sharePath, /^\/certificates\/[^/]+$/);
    const page = await api(sharePath, "GET", undefined, "public"); assert.match(await page.text(), /iframe/);
    const stream = await api(`/api/certificates/${result.testRecord.certificate_path}`, "GET", undefined, "public"); assert.deepEqual(Buffer.from(await stream.arrayBuffer()), pdf);
    await api("/api/certificates/certificates/invalid.pdf", "GET", undefined, "public", 400);
    await api(`/certificates/${randomUUID()}.pdf`, "GET", undefined, "public", 404);
    // Confirm an image upload is stored and publicly streamed as a PDF too.
    const image = new FormData(); image.set("file", new Blob([new Uint8Array(await readFile("public/certificate-templates/certificate-template-tank.png"))], { type: "image/png" }), "scan.png");
    const replacement = await (await api(`/api/test-records/${companyId}/upload-certificate`, "POST", image)).json(); objects.add(replacement.testRecord.certificate_path);
    sharePath = new URL(replacement.testRecord.certificate_url).pathname;
    const converted = await api(`/api/certificates/${replacement.testRecord.certificate_path}`, "GET", undefined, "public");
    assert.equal(converted.headers.get("content-type"), "application/pdf");
    assert.equal(Buffer.from(await converted.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  });
  await check("Browser login, dashboard, reports, audit, theme and anonymous certificate page", async () => {
    browser = await launchCertificateBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(base + "/login", { waitUntil: "networkidle0" });
    await page.type('input[type="tel"]', process.env.E2E_ADMIN_PHONE!); await page.type('input[type="password"]', process.env.E2E_ADMIN_PASSWORD!);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
    assert.match(page.url(), /dashboard/);
    await page.click('button[aria-haspopup="menu"]');
    await page.click('[role="menuitemradio"]:nth-child(2)');
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    assert.equal(await page.$eval("html", (element) => element.classList.contains("dark")), true, "Dark theme is applied after choosing it");
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.$eval("html", (element) => element.classList.contains("dark")), true, "Dark theme persists after reload");
    for (const url of ["/dashboard/reports", "/dashboard/history", "/dashboard"]) {
      const response = await page.goto(base + url, { waitUntil: "networkidle0" });
      assert.ok([200, 304].includes(response!.status()), `Browser navigation ${url} returned ${response!.status()}`);
      assert.equal(new URL(page.url()).pathname, url);
      assert.ok(await page.$("h1"), `${url} renders its heading`);
    }
    assert.equal(await page.$eval("html", (element) => element.getAttribute("dir")), "rtl", "Dashboard uses RTL");
    await mkdir("test-results", { recursive: true });
    await page.screenshot({ path: "test-results/dashboard.png", captureBeyondViewport: false });
    assert.deepEqual(errors, []);
    const context = await browser.createBrowserContext(); const publicPage = await context.newPage();
    await publicPage.setViewport({ width: 1280, height: 1000 });
    const publicErrors: string[] = [];
    publicPage.on("console", (message) => { if (message.type() === "error") publicErrors.push(message.text()); });
    publicPage.on("requestfailed", (request) => publicErrors.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
    const pdfRequest = publicPage.waitForResponse((response) => response.url().includes("/api/certificates/certificates/"));
    assert.equal((await publicPage.goto(base + sharePath, { waitUntil: "networkidle0" }))!.status(), 200, "Anonymous certificate page loads");
    assert.ok(await publicPage.$("iframe"));
    const pdfResponse = await pdfRequest;
    assert.equal(pdfResponse.status(), 200, "Anonymous iframe loads its PDF");
    assert.equal(pdfResponse.headers()["x-frame-options"], "SAMEORIGIN");
    assert.doesNotMatch(pdfResponse.headers()["content-security-policy"], /frame-ancestors 'none'/);
    // Chrome's native PDF viewer initializes after the response completes.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await writeFile("test-results/public-browser-diagnostics.json", JSON.stringify({
      errors: publicErrors,
      frames: publicPage.frames().map((frame) => frame.url()),
      targets: browser.targets().map((target) => ({ type: target.type(), url: target.url() })),
      layout: await publicPage.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, body: document.body.getBoundingClientRect().toJSON(), iframe: document.querySelector("iframe")!.getBoundingClientRect().toJSON() })),
    }, null, 2));
    assert.deepEqual(publicErrors, [], "Public PDF viewer has no browser errors");
    await publicPage.screenshot({ path: "test-results/public-certificate.png", captureBeyondViewport: false });
    await context.close();
  });
  await check("Cycle rollover, snapshots, flag reset and historical public certificate", async () => {
    const result = await (await api(`/api/test-records/${companyId}/mark-done`, "POST")).json(); assert.equal(result.testRecord.testDate, nextYearShamsi(today)); assert.equal(result.testRecord.cycleCount, 1);
    const history = await query("SELECT * FROM test_history WHERE company_id=$1", [companyId]); assert.equal(history.rows.length, 5);
    const reset = await query("SELECT tested,status FROM vessels WHERE company_id=$1", [companyId]); assert.ok(reset.rows.every((row) => !row.tested && row.status === "active"));
    await api(sharePath, "GET", undefined, "public");
  });
  await check("Monthly workbook contents and audit visibility", async () => {
    const { jYear, jMonth } = getCurrentShamsiYearMonth();
    await api("/api/reports/status");
    const response = await api(`/api/reports/download?jYear=${jYear}&jMonth=${jMonth}`);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as any); assert.equal(workbook.worksheets.length, 4);
    assert.ok(JSON.stringify(workbook.model).includes(run));
    const audit = await query("SELECT action FROM audit_logs WHERE admin_id=$1", [actorIds[0]]); assert.ok(audit.rows.some((row) => row.action === "test_record.mark_done"));
    await api("/api/audit-logs");
  });
  await check("Reminder window and duplicate suppression with mock SMS", async () => {
    await api(`/api/companies/${companyId}`, "PUT", { testDate: future });
    const record = (await query("SELECT id FROM test_records WHERE company_id=$1", [companyId])).rows[0];
    await api("/api/sms/reminders");
    await api("/api/sms/reminders/not-a-uuid", "POST", undefined, "admin", 400);
    if (isReminderSendTime()) {
      await api(`/api/sms/reminders/${record.id}`, "POST");
      await api(`/api/sms/reminders/${record.id}`, "POST", undefined, "admin", 409);
    } else {
      await api(`/api/sms/reminders/${record.id}`, "POST", undefined, "admin", 403);
      await check("Mock reminder delivery and concurrent duplicate suppression (controlled clock)", () => testReminderDuringWindow(record.id, today));
    }
  });
  await check("Cron authentication, company/device deletion and logout", async () => {
    await api("/api/cron/clear-stale-certificates", "GET", undefined, "public", 401);
    const days = Number(process.env.CERTIFICATE_CLEAR_NEAR_DUE_DAYS ?? 30);
    const unrelated = await query("SELECT id FROM test_records WHERE company_id<>$1 AND status='pending' AND certificate_uploaded=true AND certificate_cycle_count=cycle_count AND done_at IS NOT NULL AND test_date <= (now() AT TIME ZONE 'Asia/Tehran')::date+$2::int", [companyId, days]);
    if (unrelated.rows.length) {
      checks.push({ name: "Successful cron cleanup", status: "blocked", detail: "Other eligible records exist; avoid changing shared data" });
    } else {
      const retained = (await query("SELECT certificate_path,certificate_url FROM certificate_history WHERE test_record_id=(SELECT id FROM test_records WHERE company_id=$1) LIMIT 1", [companyId])).rows[0];
      await query("UPDATE test_records SET certificate_uploaded=true,certificate_path=$2,certificate_url=$3,certificate_cycle_count=cycle_count,done_at=now() WHERE company_id=$1", [companyId, retained.certificate_path, retained.certificate_url]);
      const response = await fetch(base + "/api/cron/clear-stale-certificates", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200); assert.equal((await response.json()).cleared, 1);
      assert.equal((await query("SELECT certificate_uploaded FROM test_records WHERE company_id=$1", [companyId])).rows[0].certificate_uploaded, false);
      await api(sharePath, "GET", undefined, "public");
    }
    notificationIds.push(...(await query("SELECT id FROM notifications WHERE company_id=ANY($1::uuid[])", [companies])).rows.map((row) => row.id));
    generatedIds.push(...(await query("SELECT id FROM generated_certificates WHERE company_id=ANY($1::uuid[])", [companies])).rows.map((row) => row.id));
    for (const device of devices) await api(`/api/vessels/${device.id}`, "DELETE");
    await api(`/api/companies/${companyId}`, "DELETE");
    await api("/api/auth/logout", "POST", undefined, "admin", 307);
    await api("/api/auth/logout", "POST", undefined, "tester", 307);
  });
}

async function cleanup() {
  await browser?.close(); server?.kill(); reminderServer?.kill();
  for (const key of objects) {
    try { await storage!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch { checks.push({ name: "Storage cleanup", status: "failed", detail: "Could not remove this run's uploaded object" }); }
  }
  if (actorIds.length) {
    try {
      await query("DELETE FROM generated_certificates WHERE id=ANY($1::uuid[]) OR vessel_id=ANY($2::uuid[]) OR (company_id=ANY($3::uuid[]) AND generated_by=$4)", [generatedIds, deviceIds, companies, actorIds[0]]);
      await query("DELETE FROM notifications WHERE id=ANY($1::uuid[]) OR company_id=ANY($2::uuid[])", [notificationIds, companies]);
      // History survives company deletion; use the unique run marker as an additional cleanup key.
      await query("DELETE FROM test_history WHERE company_id=ANY($1::uuid[]) OR vessel_name=$2 OR company_province=$2", [companies, run]);
      await query("DELETE FROM companies WHERE id=ANY($1::uuid[]) AND contact_name=$2", [companies, run]);
      await query("DELETE FROM audit_logs WHERE admin_id=$1", [testerId]);
      await query("DELETE FROM login_attempts WHERE phone IN (SELECT phone FROM admins WHERE id=$1)", [testerId]);
      await query("DELETE FROM admins WHERE id=$1 AND full_name=$2", [testerId, run]);
      await check("Fixture cleanup and retained admin verification", async () => {
        const admin = (await query("SELECT full_name,role,is_active FROM admins WHERE id=$1", [actorIds[0]])).rows[0];
        assert.equal(admin.full_name, process.env.E2E_ADMIN_NAME); assert.equal(admin.role, "admin"); assert.equal(admin.is_active, true);
        assert.equal((await query("SELECT id FROM admins WHERE id=$1", [testerId])).rowCount, 0);
        assert.equal((await query("SELECT id FROM companies WHERE id=ANY($1::uuid[])", [companies])).rowCount, 0);
        assert.equal((await query("SELECT id FROM test_history WHERE company_province=$1", [run])).rowCount, 0);
      });
    } catch { checks.push({ name: "Database cleanup", status: "failed", detail: "Inspect only this run's marked records" }); }
  }
  await globalThis.postgresPool?.end();
  await mkdir("test-results", { recursive: true });
  const planned = ["Liara storage put/get/delete", "Liara database connection and schema", "Create or update retained admin", "Production application starts", "Admin and tester login, sessions and protected APIs", "Create company, edit, search, filters and pagination", "All five device types, edits, tester toggles, exclusions and validation", "Generate tank and boiler PDFs without uploading", "Certificate upload, mock notification, public page and exact PDF bytes", "Browser login, dashboard, reports, audit, theme and anonymous certificate page", "Cycle rollover, snapshots, flag reset and historical public certificate", "Monthly workbook contents and audit visibility", "Reminder window and duplicate suppression with mock SMS", "Cron authentication, company/device deletion and logout"];
  for (const name of planned) if (!checks.some((check) => check.name === name)) checks.push({ name, status: "blocked", detail: "An earlier prerequisite failed" });
  await writeFile("test-results/e2e-report.json", JSON.stringify({ run, at: new Date().toISOString(), adminRetained: actorIds.length > 0, checks }, null, 2));
}

main().catch(() => { process.exitCode = 1; }).finally(async () => {
  await cleanup();
  if (checks.some((check) => check.status !== "passed")) process.exitCode = 1;
  console.log("Report: test-results/e2e-report.json");
});
