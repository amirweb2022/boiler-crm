import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { clearStaleCertificates } from "../../../../lib/db/companies.repository";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const suppliedSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : new URL(request.url).searchParams.get("token");
  const validSecret = Boolean(configuredSecret && suppliedSecret &&
    Buffer.byteLength(configuredSecret) === Buffer.byteLength(suppliedSecret) &&
    timingSafeEqual(Buffer.from(configuredSecret), Buffer.from(suppliedSecret)));
  if (!validSecret) {
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
