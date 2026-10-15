import test from "node:test";
import assert from "node:assert/strict";
import { Pool, types } from "pg";
import { S3Client } from "@aws-sdk/client-s3";
import { certificateExists, isCertificateFile } from "../lib/certificates/public";
import { GET } from "../app/api/certificates/[...path]/route";
import { middleware } from "../middleware";
import { NextRequest } from "next/server";
import { isoDateSchema } from "../lib/validation";
import { nextYearShamsi, toShamsiDisplay } from "../lib/date/shamsi";
import { shamsiMonthToGregorianRange } from "../lib/db/test-history.repository";
import { calendarDaysUntil, isReminderSendTime } from "../lib/sms/reminder-policy";
import { validateCertificateBytes } from "../lib/certificates/upload-pdf";

const file = "12345678-1234-4234-8234-123456789abc.pdf";

test("public certificate accepts only UUID-v4 filenames", () => {
  assert.equal(isCertificateFile(file), true);
  for (const value of ["../" + file, "test.pdf", file + "/a", file + ".html", file.replace("4234", "1234")]) assert.equal(isCertificateFile(value), false);
});

test("public page and stream bypass sessions while management stays protected", async () => {
  for (const path of [`/certificates/${file}`, `/api/certificates/certificates/${file}`]) assert.equal((await middleware(new NextRequest("http://localhost" + path))).headers.get("x-middleware-next"), "1");
  assert.equal((await middleware(new NextRequest("http://localhost/api/companies"))).status, 401);
  assert.equal((await middleware(new NextRequest("http://localhost/api/certificates/fields"))).status, 401);
  assert.equal((await middleware(new NextRequest("http://localhost/api/cron/clear-stale-certificates"))).headers.get("x-middleware-next"), "1");
});

test("deployment headers allow same-origin PDF frames and protect other pages", async () => {
  const config = require("../next.config.js");
  const rules = await config.headers();
  const common = rules.find((rule: { source: string }) => rule.source === "/(.*)");
  const stream = rules.find((rule: { source: string }) => rule.source === "/api/certificates/certificates/:file");
  const header = (rule: typeof common, key: string) => rule.headers.find((item: { key: string }) => item.key === key).value;
  assert.equal(header(common, "X-Frame-Options"), "DENY");
  assert.equal(header(stream, "X-Frame-Options"), "SAMEORIGIN");
  assert.match(header(stream, "Content-Security-Policy"), /frame-ancestors 'self'/);
  assert.doesNotMatch(header(stream, "Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(header(stream, "Referrer-Policy"), "no-referrer");
});

test("certificate lookup, missing files, errors and public PDF bytes", async () => {
  const originalQuery = Pool.prototype.query;
  const originalSend = S3Client.prototype.send;
  process.env.DATABASE_URL = "postgres://unused:unused@localhost/unused";
  process.env.LIARA_OBJECT_STORAGE_ENDPOINT = "https://example.invalid";
  process.env.LIARA_OBJECT_STORAGE_BUCKET = "test";
  process.env.LIARA_OBJECT_STORAGE_ACCESS_KEY = "test";
  process.env.LIARA_OBJECT_STORAGE_SECRET_KEY = "test";
  let found = true;
  let failure = false;
  const queries: string[] = [];
  (Pool.prototype as any).query = async (sql: string, values: string[]) => {
    if (failure) throw new Error("fixture database outage");
    queries.push(sql);
    assert.deepEqual(values, [`certificates/${file}`]);
    return { rows: found ? [{}] : [], rowCount: found ? 1 : 0 };
  };
  (S3Client.prototype as any).send = async () => ({ ContentType: "application/pdf", Body: { transformToByteArray: async () => Buffer.from("%PDF-test") } });
  try {
    assert.equal(await certificateExists(file), true);
    assert.match(queries[0], /certificate_history/);
    assert.doesNotMatch(queries[0], /test_history/);
    const invoke = (segments = ["certificates", file]) => GET(new Request("http://localhost"), { params: { path: segments } });
    let response = await invoke();
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "%PDF-test");
    assert.equal(response.headers.get("Content-Type"), "application/pdf");
    assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
    assert.match(response.headers.get("X-Robots-Tag")!, /noindex/);
    assert.equal((await invoke(["certificates", "../secret"])).status, 400);
    found = false;
    assert.equal((await invoke()).status, 404);
    failure = true;
    assert.equal((await invoke()).status, 503);
  } finally {
    Pool.prototype.query = originalQuery;
    S3Client.prototype.send = originalSend;
    await globalThis.postgresPool?.end();
    globalThis.postgresPool = undefined;
  }
});

test("calendar dates stay ISO and reject impossible dates", () => {
  assert.equal(types.getTypeParser(1082)("2026-10-16"), "2026-10-16");
  assert.equal(isoDateSchema.safeParse("2026-02-30").success, false);
  assert.equal(isoDateSchema.safeParse("2026-10-16").success, true);
  assert.match(nextYearShamsi("2026-10-16"), /^2027-\d\d-\d\d$/);
  assert.equal(calendarDaysUntil("2026-10-18", "2026-10-16"), 2);
  assert.equal(isReminderSendTime(new Date("2026-10-16T04:30:00Z")), true);
  assert.equal(isReminderSendTime(new Date("2026-10-16T18:30:00Z")), false);
});

test("uploads reject content disguised as a certificate", () => {
  assert.throws(() => validateCertificateBytes(Buffer.from("<html>fake</html>"), "application/pdf"));
  assert.throws(() => validateCertificateBytes(Buffer.alloc(0), "image/png"));
  assert.doesNotThrow(() => validateCertificateBytes(Buffer.from("%PDF-1.7\n"), "application/pdf"));
});

test("server calendar agrees with the date picker at Nowruz and leap Esfand", () => {
  assert.equal(toShamsiDisplay("2025-03-20"), "1403/12/30");
  assert.equal(toShamsiDisplay("2025-03-21"), "1404/01/01");
  assert.equal(nextYearShamsi("2025-03-20"), "2026-03-20");
  assert.deepEqual(shamsiMonthToGregorianRange(1404, 1), { startISO: "2025-03-21", endISO: "2025-04-20" });
});
