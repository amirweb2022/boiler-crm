import { launchCertificateBrowser } from "./browser";
import { ValidationError } from "../validation";

export function validateCertificateBytes(bytes: Buffer, contentType: string) {
  const valid = contentType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
    : contentType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : contentType === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!valid) throw new ValidationError("محتوای فایل با نوع گواهی مطابقت ندارد");
}

export async function certificateUploadPdf(bytes: Buffer, contentType: string): Promise<Buffer> {
  validateCertificateBytes(bytes, contentType);
  if (contentType === "application/pdf") return bytes;
  if (contentType !== "image/png" && contentType !== "image/jpeg") throw new Error("Unsupported certificate type");
  const browser = await launchCertificateBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(`<html><head><style>@page{size:A4;margin:10mm}body{margin:0}img{max-width:100%;max-height:270mm;object-fit:contain}</style></head><body><img src="data:${contentType};base64,${bytes.toString("base64")}"></body></html>`, { waitUntil: "load" });
    await page.evaluate(async () => {
      const image = document.querySelector("img")!;
      await image.decode();
    }).catch(() => { throw new ValidationError("تصویر گواهی معتبر نیست"); });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  } finally {
    await browser.close();
  }
}
