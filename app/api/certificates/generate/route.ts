import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, ForbiddenError } from "../../../../lib/auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { generateCertificatePdf } from "../../../../lib/certificates/generate";
import { getCertificateFields } from "../../../../lib/certificates/field-schema";
import { toShamsiDisplay } from "../../../../lib/date/shamsi";
import { uuidSchema, parseOrThrow, ValidationError } from "../../../../lib/validation";
import { logAudit } from "../../../../lib/audit";
import { getClientIp } from "../../../../lib/rate-limit";

const generateCertificateSchema = z.object({
  vesselId: uuidSchema,
  values: z.record(z.string().max(200)),
});

// POST /api/certificates/generate
// فقط admin. داده‌های سیستمی (نام/نشانی شرکت، حجم مخزن، تاریخ آزمون) خودکار
// از دیتابیس خوانده می‌شود؛ بقیه از فرم گرفته می‌شود. اعتبارسنجی الزامی‌بودن
// (ضخامت‌ها + فشار سوپاپ اطمینان) اینجا دوباره چک می‌شود، نه فقط در فرانت.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const body = parseOrThrow(generateCertificateSchema, await req.json());

    const db = getSupabaseServerClient();
    const { data: vessel, error: vesselError } = await db
      .from("vessels")
      .select("*, companies(*, test_records(*))")
      .eq("id", body.vesselId)
      .single();
    if (vesselError || !vessel) throw new ValidationError("مخزن یافت نشد");

    const vesselType = (vessel.type ?? "tank") as "tank" | "boiler";
    const company = vessel.companies;
    const testRecord = Array.isArray(company?.test_records) ? company.test_records[0] : company?.test_records;

    const fields = getCertificateFields(vesselType);

    const missing: string[] = [];
    for (const f of fields) {
      if (f.auto || !f.required) continue;
      if (!body.values[f.key]?.trim()) missing.push(f.label);
    }
    if (missing.length > 0) {
      throw new ValidationError(`این فیلدها الزامی‌اند: ${missing.join("، ")}`);
    }

    const autoValues: Record<string, string> = {
      companyName: company?.name ?? "",
      companyAddress: company?.address ?? "",
      vesselVolume: vessel.volume ?? "",
      testDate: testRecord ? toShamsiDisplay(testRecord.test_date) : "",
    };

    const mergedValues: Record<string, string> = {};
    for (const f of fields) {
      mergedValues[f.key] = f.auto ? autoValues[f.auto] ?? "" : body.values[f.key] ?? "";
    }

    const pdfBuffer = await generateCertificatePdf({ vesselType, values: mergedValues });

    const { data: certRow, error: certError } = await db
      .from("generated_certificates")
      .insert({
        vessel_id: vessel.id,
        company_id: company?.id ?? null,
        equipment_type: vesselType,
        field_values: mergedValues,
        generated_by: admin.id,
      })
      .select()
      .single();
    if (certError) throw certError;

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "certificate.generate",
      entityType: "vessel",
      entityId: vessel.id,
      metadata: { certificateNumber: certRow.certificate_number, vesselType },
      ip: getClientIp(req),
    });

    const fileName = `گواهی-${vessel.name}-${certRow.certificate_number}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
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
    return NextResponse.json({ error: "خطای سرور در ساخت گواهی" }, { status: 500 });
  }
}
