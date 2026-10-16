import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "../../../../../lib/auth";
import { query } from "../../../../../lib/db/postgres";
import { uploadCertificate } from "../../../../../lib/storage/certificates";
import { getSmsProvider } from "../../../../../lib/sms";
import { uuidSchema, parseOrThrow, ValidationError } from "../../../../../lib/validation";
import { logAudit } from "../../../../../lib/audit";
import { getClientIp } from "../../../../../lib/rate-limit";
import { daysUntil } from "../../../../../lib/date/shamsi";
import { certificateUploadPdf } from "../../../../../lib/certificates/upload-pdf";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// POST /api/test-records/:companyId/upload-certificate
// پیش‌نیاز طبق نیازمندی: فقط وقتی همه مخازن تیک «تست‌شده» خورده باشند
// اجازه‌ی آپلود گواهی وجود دارد (دقیقاً مثل شرط دکمه «ثبت انجام»).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole("admin");
    const companyId = parseOrThrow(uuidSchema, params.id);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (file && typeof file.arrayBuffer !== "function") throw new ValidationError("فایل گواهی نامعتبر است");
    if (!file) return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 });

    // اعتبارسنجی نوع و حجم فایل — جلوگیری از آپلود فایل‌های اجرایی/مخرب
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "فرمت فایل باید PDF، JPG یا PNG باشد" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد" }, { status: 400 });
    }

    const { rows: companyRows } = await query(`SELECT c.*,tr.id AS test_record_id,tr.test_date,tr.cycle_count,tr.certificate_uploaded,tr.certificate_url,tr.certificate_path,tr.status AS test_status FROM companies c LEFT JOIN test_records tr ON tr.company_id=c.id WHERE c.id=$1`, [companyId]);
    const company = companyRows[0];
    if (!company) {
      return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
    }

    const testRecord = company.test_record_id ? { id:company.test_record_id,test_date:company.test_date,cycle_count:company.cycle_count,certificate_uploaded:company.certificate_uploaded,certificate_url:company.certificate_url,certificate_path:company.certificate_path,status:company.test_status } : null;
    if (!testRecord) {
      return NextResponse.json({ error: "رکورد تست یافت نشد" }, { status: 404 });
    }

    if (testRecord.status !== "pending" || daysUntil(testRecord.test_date) > 0) {
      throw new ValidationError("بارگذاری گواهی فقط پس از سررسید و در چرخه جاری مجاز است");
    }
    const { rows: vessels } = await query(`SELECT id,tested,status FROM vessels WHERE company_id=$1`,[companyId]);
    const allTested = vessels.length > 0 && vessels.every((v: any) => v.status === "excluded" || v.tested);
    if (!allTested) {
      return NextResponse.json(
        { error: "برای ثبت گواهی، ابتدا همه مخازن باید تست‌شده علامت بخورند" },
        { status: 400 }
      );
    }

    // نام فایل با UUID تصادفی بازسازی می‌شود (نه نام اصلی فایل کاربر) تا
    // از path traversal یا کاراکترهای غیرمنتظره در نام فایل جلوگیری شود
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await certificateUploadPdf(Buffer.from(arrayBuffer), file.type);
    const { path } = await uploadCertificate(pdf, "application/pdf", "certificate.pdf");
    const publicUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).replace(/\/$/, "")}/certificates/${encodeURIComponent(path.split("/").pop()!)}`;
    const { rows: updatedRows } = await query(`UPDATE test_records SET certificate_uploaded=true,certificate_url=$2,certificate_path=$3,certificate_cycle_count=$4,proof_of_upload_pending=false,updated_at=now() WHERE id=$1 RETURNING *`,[testRecord.id,publicUrl,path,(testRecord.cycle_count??0)+1]);
    const updated = updatedRows[0];

    const sms = getSmsProvider();
    const message = `مشتری گرامی، ${company.name}
گواهی ارزیابی ایمنی تجهیزات شما آماده و از طریق پست/تیپاکس ارسال شد. جهت مشاهده گواهی به لینک زیر مراجعه کنید:
${publicUrl}
اخگر صنعت پویا`;
    const smsResult = await sms.send({ phone: company.phone, message });

    try { await query(`INSERT INTO notifications(company_id,test_record_id,phone,message,type,status,provider_ref,sent_at) VALUES($1,$2,$3,$4,'certificate_ready',$5,$6,$7)`,[company.id,testRecord.id,company.phone,message,smsResult.success?'sent':'failed',smsResult.providerRef??null,smsResult.success?new Date():null]); }
    catch(error) { console.error("Certificate SMS notification insert failed",error); }

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
