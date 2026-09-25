import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../../lib/auth";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { getSmsProvider } from "../../../../../lib/sms";
import { uuidSchema, parseOrThrow, ValidationError } from "../../../../../lib/validation";
import { logAudit } from "../../../../../lib/audit";
import { getClientIp } from "../../../../../lib/rate-limit";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// POST /api/test-records/:companyId/upload-certificate
// پیش‌نیاز طبق نیازمندی: فقط وقتی همه مخازن تیک «تست‌شده» خورده باشند
// اجازه‌ی آپلود گواهی وجود دارد (دقیقاً مثل شرط دکمه «ثبت انجام»).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const companyId = parseOrThrow(uuidSchema, params.id);
    const db = getSupabaseServerClient();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 });

    // اعتبارسنجی نوع و حجم فایل — جلوگیری از آپلود فایل‌های اجرایی/مخرب
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "فرمت فایل باید PDF، JPG یا PNG باشد" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد" }, { status: 400 });
    }

    const { data: company, error: companyError } = await db
      .from("companies")
      .select("*, test_records(*), vessels(id, tested, status)")
      .eq("id", companyId)
      .single();
    if (companyError || !company) {
      return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
    }

    const testRecord = Array.isArray(company.test_records) ? company.test_records[0] : company.test_records;
    if (!testRecord) {
      return NextResponse.json({ error: "رکورد تست یافت نشد" }, { status: 404 });
    }

    const vessels = company.vessels ?? [];
    const allTested = vessels.length > 0 && vessels.every((v: any) => v.status === "excluded" || v.tested);
    if (!allTested) {
      return NextResponse.json(
        { error: "برای ثبت گواهی، ابتدا همه مخازن باید تست‌شده علامت بخورند" },
        { status: 400 }
      );
    }

    // نام فایل با UUID تصادفی بازسازی می‌شود (نه نام اصلی فایل کاربر) تا
    // از path traversal یا کاراکترهای غیرمنتظره در نام فایل جلوگیری شود
    const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await db.storage
      .from("certificates")
      .upload(path, Buffer.from(arrayBuffer), { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = db.storage.from("certificates").getPublicUrl(path);

    const { data: updated, error: updateError } = await db
      .from("test_records")
      .update({
        certificate_uploaded: true,
        certificate_url: publicUrl.publicUrl,
        certificate_path: path,
        proof_of_upload_pending: false,
      })
      .eq("id", testRecord.id)
      .select()
      .single();
    if (updateError) throw updateError;

    const sms = getSmsProvider();
    const message = `گواهی آزمون دیگ بخار شرکت ${company.name} صادر شد.\nلینک دانلود: ${publicUrl.publicUrl}`;
    const smsResult = await sms.send({ phone: company.phone, message });

    await db.from("notifications").insert({
      company_id: company.id,
      test_record_id: testRecord.id,
      phone: company.phone,
      message,
      type: "certificate_ready",
      status: smsResult.success ? "sent" : "failed",
      provider_ref: smsResult.providerRef ?? null,
      sent_at: smsResult.success ? new Date().toISOString() : null,
    });

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "test_record.upload_certificate",
      entityType: "test_record",
      entityId: testRecord.id,
      metadata: { companyId, fileSize: file.size, mimeType: file.type },
      ip: getClientIp(req),
    });

    return NextResponse.json({ testRecord: updated, sms: smsResult });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
