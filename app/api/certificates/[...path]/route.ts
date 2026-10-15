import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { query } from "../../../../lib/db/postgres";
import { downloadCertificate } from "../../../../lib/storage/certificates";

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    await requireAdmin();
    const path = params.path.join("/");
    if (!path.startsWith("certificates/") || path.includes("..")) {
      return NextResponse.json({ error: "Invalid certificate path" }, { status: 400 });
    }

    const { rowCount } = await query(
      "SELECT 1 FROM test_records WHERE certificate_path=$1 UNION SELECT 1 FROM test_history WHERE certificate_path=$1 LIMIT 1",
      [path],
    );
    if (!rowCount) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

    const certificate = await downloadCertificate(path);
    return new NextResponse(Buffer.from(certificate.body), {
      headers: {
        "Content-Type": certificate.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Certificate unavailable" }, { status: 404 });
  }
}
