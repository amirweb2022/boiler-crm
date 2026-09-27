// =====================================================================
// نقشه‌ی دقیق فیلدهای هر قالب گواهی — چون این PDFها اسکن تصویری خام‌اند
// (نه فرم قابل‌پرکردن)، مختصات هر خط خالی به‌صورت دستی از روی تصویر
// اندازه‌گیری و اینجا ثابت شده. واحد مختصات: پیکسل تصویر پس‌زمینه
// (۱۱۹۰×۱۶۸۴ — دقیقاً همان دو فایل tank.png / boiler.png).
//
// نکته: چون منبع تصویر اسکن است نه یک فرم واقعی، این مختصات تخمینی و
// نیازمند یک دور بازبینی بصری بعد از اولین گواهی نمونه است.
// =====================================================================

export type VesselType = "tank" | "boiler";

export interface CertificateFieldPosition {
  x: number; // لبه‌ی راستِ متن روی این x قرار می‌گیرد و به چپ رشد می‌کند
  y: number;
}

export interface CertificateFieldDef {
  key: string;
  label: string;
  required: boolean;
  auto?: "companyName" | "companyAddress" | "vesselVolume" | "testDate";
  group?: string; // فیلدهای هم‌گروه با هم به‌عنوان یک بخش الزامی نمایش داده می‌شوند
  positions: CertificateFieldPosition[]; // ممکن است در چند نقطه از سند تکرار شود
}

export const CERTIFICATE_IMAGE_WIDTH = 1190;
export const CERTIFICATE_IMAGE_HEIGHT = 1684;

export const TANK_CERTIFICATE_FIELDS: CertificateFieldDef[] = [
  { key: "companyName", label: "نام شرکت", required: false, auto: "companyName", positions: [{ x: 915, y: 353 }] },
  { key: "companyAddress", label: "نشانی", required: false, auto: "companyAddress", positions: [{ x: 915, y: 403 }] },
  { key: "tankCapacity", label: "ظرفیت مخزن", required: false, auto: "vesselVolume", positions: [{ x: 415, y: 586 }] },
  {
    key: "testDate",
    label: "تاریخ آزمایش",
    required: false,
    auto: "testDate",
    positions: [
      { x: 398, y: 783 },
      { x: 390, y: 1002 },
    ],
  },

  { key: "serialNumber", label: "شماره سریال", required: false, positions: [{ x: 425, y: 508 }] },
  { key: "manufacturerName", label: "نام موسسه سازنده", required: false, positions: [{ x: 825, y: 508 }] },
  { key: "operationYear", label: "سال بهره برداری", required: false, positions: [{ x: 395, y: 558 }] },
  { key: "manufactureYear", label: "سال ساخت", required: false, positions: [{ x: 845, y: 558 }] },
  { key: "maxAllowedPressure", label: "حداکثر فشار مجاز", required: false, positions: [{ x: 795, y: 586 }] },
  { key: "testedPressure", label: "فشار آزمایش شده", required: false, positions: [{ x: 795, y: 613 }] },

  { key: "safetyValvePressure", label: "فشار سوپاپ اطمینان مخزن (بار)", required: true, positions: [{ x: 425, y: 758 }] },
  {
    key: "workingPressure",
    label: "فشار کاری / بهره‌برداری (بار)",
    required: false,
    positions: [
      { x: 845, y: 753 },
      { x: 328, y: 930 },
      { x: 593, y: 1002 },
    ],
  },
  { key: "tankRadius", label: "شعاع مخزن", required: false, positions: [{ x: 825, y: 783 }] },

  { key: "inspectorPresentName", label: "نام حاضر در آزمایش (آقای)", required: false, positions: [{ x: 603, y: 808 }] },
  { key: "inspectorPresentPosition", label: "سمت ایشان", required: false, positions: [{ x: 423, y: 808 }] },
  { key: "inspectionTestPressure", label: "فشار حین بازرسی (بار)", required: false, positions: [{ x: 253, y: 808 }] },

  { key: "upperHeadThickness", label: "ضخامت عدسی فوقانی (میلیمتر)", required: true, group: "thickness", positions: [{ x: 618, y: 900 }] },
  { key: "lowerHeadThickness", label: "ضخامت عدسی تحتانی (میلیمتر)", required: true, group: "thickness", positions: [{ x: 408, y: 900 }] },
  { key: "bodyThickness", label: "ضخامت بدنه (میلیمتر)", required: true, group: "thickness", positions: [{ x: 248, y: 900 }] },
];

export const BOILER_CERTIFICATE_FIELDS: CertificateFieldDef[] = [
  { key: "companyName", label: "نام شرکت", required: false, auto: "companyName", positions: [{ x: 915, y: 353 }] },
  { key: "companyAddress", label: "نشانی", required: false, auto: "companyAddress", positions: [{ x: 915, y: 403 }] },
  { key: "boilerCapacity", label: "ظرفیت دیگ (LBS/H)", required: false, auto: "vesselVolume", positions: [{ x: 700, y: 600 }] },
  {
    key: "testDate",
    label: "تاریخ آزمایش هیدرواستاتیک",
    required: false,
    auto: "testDate",
    positions: [
      { x: 270, y: 750 },
      { x: 20, y: 955 },
    ],
  },

  { key: "serialNumber", label: "شماره سریال", required: false, positions: [{ x: 425, y: 458 }] },
  { key: "manufacturerName", label: "نام موسسه سازنده", required: false, positions: [{ x: 795, y: 458 }] },
  { key: "operationYear", label: "سال بهره برداری", required: false, positions: [{ x: 395, y: 508 }] },
  { key: "manufactureYear", label: "سال ساخت", required: false, positions: [{ x: 845, y: 508 }] },
  { key: "designPressure", label: "فشار طراحی", required: false, positions: [{ x: 395, y: 533 }] },
  { key: "maxAllowedPressure", label: "حداکثر فشار مجاز", required: false, positions: [{ x: 795, y: 533 }] },
  { key: "hydrostaticTestPressure", label: "فشار آزمایش شده هیدرو استاتیک", required: false, positions: [{ x: 305, y: 563 }] },
  { key: "constructionStandard", label: "استاندارد ساخت", required: false, positions: [{ x: 825, y: 563 }] },
  { key: "fuelType", label: "نوع سوخت", required: false, positions: [{ x: 385, y: 603 }] },

  { key: "inspectionTestPressure", label: "فشار در زمان آزمایش (بار)", required: false, positions: [{ x: 500, y: 708 }] },
  {
    key: "workingPressure",
    label: "فشار کاری / بهره‌برداری (بار)",
    required: false,
    positions: [
      { x: 845, y: 708 },
      { x: 428, y: 958 },
    ],
  },
  {
    key: "safetyValvePressure",
    label: "فشار سوپاپ اطمینان دوقلو دسته‌دار (بار)",
    required: true,
    positions: [
      { x: 618, y: 753 },
      { x: 150, y: 958 },
    ],
  },

  { key: "inspectorPresentName", label: "نام حاضر در آزمایش (آقای)", required: false, positions: [{ x: 603, y: 808 }] },
  { key: "inspectorPresentPosition", label: "سمت ایشان", required: false, positions: [{ x: 423, y: 808 }] },
  { key: "inspectionTestPressure2", label: "فشار حین آزمایش هیدرواستاتیک (بار)", required: false, positions: [{ x: 253, y: 808 }] },

  { key: "frontGridThickness", label: "ضخامت شبکه جلو (میلیمتر)", required: true, group: "thickness", positions: [{ x: 555, y: 858 }] },
  { key: "rearGridThickness", label: "ضخامت شبکه عقب (میلیمتر)", required: true, group: "thickness", positions: [{ x: 375, y: 858 }] },
  { key: "secondPassThickness", label: "ضخامت پاس دو (میلیمتر)", required: true, group: "thickness", positions: [{ x: 205, y: 858 }] },
  { key: "simpleFurnaceThickness", label: "ضخامت کوره ساده (میلیمتر)", required: true, group: "thickness", positions: [{ x: 35, y: 858 }] },
  { key: "bodyThickness", label: "ضخامت بدنه (میلیمتر)", required: true, group: "thickness", positions: [{ x: 955, y: 880 }] },
];

export function getCertificateFields(type: VesselType): CertificateFieldDef[] {
  return type === "boiler" ? BOILER_CERTIFICATE_FIELDS : TANK_CERTIFICATE_FIELDS;
}