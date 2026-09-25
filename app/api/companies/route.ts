import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireRole, ForbiddenError } from "../../../lib/auth";
import {
  listCompaniesWithDetails,
  createCompanyWithTestRecord,
} from "../../../lib/db/companies.repository";
import { createCompanySchema, parseOrThrow, ValidationError } from "../../../lib/validation";
import { logAudit } from "../../../lib/audit";
import { getClientIp } from "../../../lib/rate-limit";
import type { CompanyListFilters } from "../../../types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sp = req.nextUrl.searchParams;
    const filters: CompanyListFilters = {
      search: sp.get("search")?.slice(0, 100) ?? undefined,
      province: sp.get("province") ?? undefined,
      status: (sp.get("status") as any) ?? "all",
      proximity: (sp.get("proximity") as any) ?? "all",
      page: Math.max(1, Number(sp.get("page") ?? 1) || 1),
      pageSize: Number(sp.get("pageSize") ?? 20),
    };

    const result = await listCompaniesWithDetails(filters);
    return NextResponse.json(result);
  } catch (err: any) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("admin");
    const body = parseOrThrow(createCompanySchema, await req.json());

    const company = await createCompanyWithTestRecord(body);

    await logAudit({
      adminId: admin.id,
      adminPhone: admin.phone,
      action: "company.create",
      entityType: "company",
      entityId: company.id,
      metadata: { catalogCode: company.catalogCode },
      ip: getClientIp(req),
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (err: any) {
    return handleError(err);
  }
}

function handleError(err: any) {
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
