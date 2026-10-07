import { NextResponse } from "next/server";
import { clearStaleCertificates } from "../../../../lib/db/companies.repository";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret || authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const nearDueDays = Number(process.env.CERTIFICATE_CLEAR_NEAR_DUE_DAYS ?? 30);
    const { cleared } = await clearStaleCertificates(nearDueDays);
    return NextResponse.json({ cleared: cleared.length });
  } catch (error) {
    console.error("Failed to clear stale certificates", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
