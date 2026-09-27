import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import {
  getCertificateFields,
  CERTIFICATE_IMAGE_WIDTH,
  CERTIFICATE_IMAGE_HEIGHT,
  type VesselType,
} from "./field-schema";

// =====================================================================
// روش کار: تصویر اسکن‌شده‌ی قالب اصلی (بدون هیچ تغییری) به‌عنوان
// پس‌زمینه‌ی یک صفحه HTML قرار می‌گیرد و مقادیر دقیقاً روی مختصات
// اندازه‌گیری‌شده overlay می‌شوند؛ سپس با یک مرورگر headless (Puppeteer)
// به PDF چاپ می‌شود. این تنها روشی است که هم شکل اصلی سند را عیناً حفظ
// می‌کند و هم متن فارسی را با شکل صحیح حروف (نه بهم‌ریخته) رندر می‌کند.
// =====================================================================

interface GenerateCertificateInput {
  vesselType: VesselType;
  values: Record<string, string>; // کلید فیلد → مقدار نهایی (auto یا دستی، از قبل merge شده)
}

function getTemplateImageBase64(vesselType: VesselType): string {
  const fileName =
    vesselType === "boiler"
      ? "certificate-template-boiler.png"
      : "certificate-template-tank.png";
  const filePath = path.join(
    process.cwd(),
    "public",
    "certificate-templates",
    fileName,
  );
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(input: GenerateCertificateInput): string {
  const fields = getCertificateFields(input.vesselType);
  const imageSrc = getTemplateImageBase64(input.vesselType);

  const overlays = fields
    .flatMap((field) =>
      field.positions.map((pos) => {
        const value = input.values[field.key];
        if (!value) return "";
        const rightPx = CERTIFICATE_IMAGE_WIDTH - pos.x;
        return `<div class="field-value" style="right:${rightPx}px; top:${pos.y - 14}px; font-size:${field.font}px;">${escapeHtml(value)}</div>`;
      }),
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; }
  .page {
    position: relative;
    width: ${CERTIFICATE_IMAGE_WIDTH}px;
    height: ${CERTIFICATE_IMAGE_HEIGHT}px;
  }
  .page img { position:absolute; top:0; left:0; width:100%; height:100%; }
  .field-value {
    position: absolute;
    direction: rtl;
    white-space: nowrap;
    font-weight: 700;
    color: #000;
  }
</style>
</head>
<body>
  <div class="page">
    <img src="${imageSrc}" />
    ${overlays}
  </div>
</body>
</html>`;
}

export async function generateCertificatePdf(
  input: GenerateCertificateInput,
): Promise<Buffer> {
  const html = buildHtml(input);
  const chromePaths = [
    String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
    String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
    String.raw`${process.env.LOCALAPPDATA}\Google\Chrome\Application\chrome.exe`,
  ];
  const executablePath = chromePaths.find((path) => fs.existsSync(path));
  if (!executablePath) {
    throw new Error("Google Chrome was not found.");
  }
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      width: `${CERTIFICATE_IMAGE_WIDTH}px`,
      height: `${CERTIFICATE_IMAGE_HEIGHT}px`,
      printBackground: true,
      pageRanges: "1",
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
