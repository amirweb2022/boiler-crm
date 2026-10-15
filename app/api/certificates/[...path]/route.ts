import { NextResponse } from "next/server";
import { certificateExists, isCertificateFile } from "../../../../lib/certificates/public";
import { downloadCertificate } from "../../../../lib/storage/certificates";
import { certificateUploadPdf } from "../../../../lib/certificates/upload-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    const path = params.path.join("/");
    if (params.path.length !== 2 || params.path[0] !== "certificates" || !isCertificateFile(params.path[1])) {
      return NextResponse.json({ error: "Invalid certificate path" }, { status: 400 });
    }

    if (!await certificateExists(params.path[1])) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

    const certificate = await downloadCertificate(path);
    const pdf = await certificateUploadPdf(Buffer.from(certificate.body), certificate.contentType);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Certificate unavailable" }, { status: 503 });
  }
}
