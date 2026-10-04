// =====================================================================
// نقشه‌ی دقیق فیلدهای هر قالب گواهی — چون این PDFها اسکن تصویری خام‌اند
// (نه فرم قابل‌پرکردن)، مختصات هر خط خالی به‌صورت دستی از روی تصویر
// اندازه‌گیری و اینجا ثابت شده. واحد مختصات: پیکسل تصویر پس‌زمینه
// (۱۱۹۰×۱۶۸۴ — فایل‌های certificate-template-tank.png / certificate-template-boiler.png).
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
  font: number;
}

export const CERTIFICATE_IMAGE_WIDTH = 1190;
export const CERTIFICATE_IMAGE_HEIGHT = 1684;

export const TANK_CERTIFICATE_FIELDS: CertificateFieldDef[] = [
  {
    key: "companyName",
    label: "نام شرکت",
    required: false,
    auto: "companyName",
    positions: [{ x: 780, y: 350 }],
    font: 23,
  },
  {
    key: "companyAddress",
    label: "نشانی",
    required: false,
    auto: "companyAddress",
    positions: [{ x: 960, y: 403 }],
    font: 23,
  },
  {
    key: "tankCapacity",
    label: "ظرفیت مخزن",
    required: false,
    auto: "vesselVolume",
    positions: [{ x: 460, y: 589 }],
    font: 23,
  },
  {
    key: "testDate",
    label: "تاریخ آزمایش",
    required: false,
    auto: "testDate",
    positions: [
      { x: 460, y: 785 },
    ],
    font: 23,
  },

  {
    key: "serialNumber",
    label: "شماره سریال",
    required: false,
    positions: [{ x: 465, y: 522 }],
    font: 23,
  },
  {
    key: "manufacturerName",
    label: "نام موسسه سازنده",
    required: false,
    positions: [{ x: 860, y: 522 }],
    font: 23,
  },
  {
    key: "operationYear",
    label: "سال بهره برداری",
    required: false,
    positions: [{ x: 440, y: 553 }],
    font: 23,
  },
  {
    key: "manufactureYear",
    label: "سال ساخت",
    required: false,
    positions: [{ x: 915, y: 553 }],
    font: 23,
  },
  {
    key: "maxAllowedPressure",
    label: "حداکثر فشار مجاز",
    required: false,
    positions: [{ x: 862, y: 589 }],
    font: 23,
  },
  {
    key: "testedPressure",
    label: "فشار آزمایش شده",
    required: false,
    positions: [{ x: 862, y: 620 }],
    font: 23,
  },

  {
    key: "safetyValvePressure",
    label: "فشار سوپاپ اطمینان مخزن (بار)",
    required: true,
    positions: [{ x: 420, y: 753 }],
    font: 23,
  },
  {
    key: "workingPressure",
    label: "فشار کاری / بهره‌برداری (بار)",
    required: false,
    positions: [
      { x: 810, y: 753 },
      { x: 463, y: 935 },
      { x: 735, y: 1005 },
    ],
    font: 20,
  },
  {
    key: "tankRadius",
    label: "شعاع مخزن",
    required: false,
    positions: [{ x: 915, y: 785 }],
    font: 23,
  },

  {
    key: "inspectorPresentName",
    label: "نام حاضر در آزمایش (آقای)",
    required: false,
    positions: [{ x: 555, y: 845 }],
    font: 16,
  },
  {
    key: "inspectorPresentPosition",
    label: "سمت ایشان",
    required: false,
    positions: [{ x: 403, y: 835 }],
    font: 16,
  },
  {
    key: "inspectionTestPressure",
    label: "فشار حین بازرسی (بار)",
    required: false,
    positions: [{ x: 303, y: 828 }],
    font: 20,
  },

  {
    key: "upperHeadThickness",
    label: "ضخامت عدسی فوقانی (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 710, y: 903 }],
    font: 20,
  },
  {
    key: "lowerHeadThickness",
    label: "ضخامت عدسی تحتانی (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 528, y: 903 }],
    font: 20,
  },
  {
    key: "bodyThickness",
    label: "ضخامت بدنه (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 408, y: 903 }],
    font: 20,
  },
];

export const BOILER_CERTIFICATE_FIELDS: CertificateFieldDef[] = [
  {
    key: "companyName",
    label: "نام شرکت",
    required: false,
    auto: "companyName",
    positions: [{ x: 780, y: 305 }],
    font: 23,
  },
  {
    key: "companyAddress",
    label: "نشانی",
    required: false,
    auto: "companyAddress",
    positions: [{ x: 1000, y: 353 }],
    font: 23,
  },
  {
    key: "boilerCapacity",
    label: "ظرفیت دیگ (LBS/H)",
    required: false,
    auto: "vesselVolume",
    positions: [{ x: 870, y: 610 }],
    font: 23,
  },
  {
    key: "testDate",
    label: "تاریخ آزمایش هیدرواستاتیک",
    required: false,
    auto: "testDate",
    positions: [
      { x: 350, y: 743 },
      // { x: 20, y: 955 },
    ],
    font: 23,
  },

  {
    key: "serialNumber",
    label: "شماره سریال",
    required: false,
    positions: [{ x: 470, y: 468 }],
    font: 23,
  },
  // FIXED: was one row too low (sitting on the blank "سال ساخت" row) → now aligned with its own label
  {
    key: "manufacturerName",
    label: "نام موسسه سازنده",
    required: false,
    positions: [{ x: 900, y: 468 }],
    font: 23,
  },
  // FIXED: was pointing at designPressure's value ("1260") → now points at the real operation-year value ("10")
  {
    key: "operationYear",
    label: "سال بهره برداری",
    required: false,
    positions: [{ x: 445, y: 510 }],
    font: 23,
  },
  // FIXED: was pointing at "1240" (maxAllowedPressure's value) → now sits on its own row (blank on this sample)
  {
    key: "manufactureYear",
    label: "سال ساخت",
    required: false,
    positions: [{ x: 955, y: 505 }],
    font: 23,
  },
  // FIXED: was pointing at operationYear's value ("10") → now points at the real design-pressure value ("1260")
  {
    key: "designPressure",
    label: "فشار طراحی",
    required: false,
    positions: [{ x: 470, y: 538 }],
    font: 23,
  },
  // FIXED: was pointing at an unlabeled stray "12" → now points at "1240", next to حداکثر فشار مجاز
  {
    key: "maxAllowedPressure",
    label: "حداکثر فشار مجاز",
    required: false,
    positions: [{ x: 915, y: 538 }],
    font: 23,
  },
  {
    key: "hydrostaticTestPressure",
    label: "فشار آزمایش شده هیدرو استاتیک",
    required: false,
    positions: [{ x: 309, y: 570 }],
    font: 23,
  },
  {
    key: "constructionStandard",
    label: "استاندارد ساخت",
    required: false,
    positions: [{ x: 920, y: 566 }],
    font: 23,
  },
  {
    key: "fuelType",
    label: "نوع سوخت",
    required: false,
    positions: [{ x: 484, y: 604 }],
    font: 23,
  },

  {
    key: "inspectionTestPressure",
    label: "فشار در زمان آزمایش (بار)",
    required: false,
    positions: [{ x: 380, y: 710 }],
    font: 23,
  },
  {
    key: "workingPressure",
    label: "فشار کاری / بهره‌برداری (بار)",
    required: false,
    positions: [
      { x: 830, y: 708 },
      { x: 173, y: 895 },
      { x: 535, y: 965 },
    ],
    font: 20,
  },
  {
    key: "safetyValvePressure",
    label: "فشار سوپاپ اطمینان دوقلو دسته‌دار (بار)",
    required: true,
    positions: [
      { x: 738, y: 743 },
      { x: 270, y: 965 },
    ],
    font: 20,
  },

  {
    key: "inspectorPresentName",
    label: "نام حاضر در آزمایش (آقای)",
    required: false,
    positions: [{ x: 633, y: 808 }],
    font: 16,
  },
  {
    key: "inspectorPresentPosition",
    label: "سمت ایشان",
    required: false,
    positions: [{ x: 510, y: 808 }],
    font: 16,
  },
  {
    key: "inspectionTestPressure2",
    label: "فشار حین آزمایش هیدرواستاتیک (بار)",
    required: false,
    positions: [{ x: 423, y: 790 }],
    font: 20,
  },

  {
    key: "frontGridThickness",
    label: "ضخامت شبکه جلو (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 563, y: 860 }],
    font: 20,
  },
  {
    key: "rearGridThickness",
    label: "ضخامت شبکه عقب (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 403, y: 860 }],
    font: 20,
  },
  {
    key: "secondPassThickness",
    label: "ضخامت پاس دو (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 262, y: 860 }],
    font: 20,
  },
  {
    key: "simpleFurnaceThickness",
    label: "ضخامت کوره ساده (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 105, y: 860 }],
    font: 20,
  },
  {
    key: "bodyThickness",
    label: "ضخامت بدنه (میلیمتر)",
    required: true,
    group: "thickness",
    positions: [{ x: 978, y: 888 }],
    font: 20,
  },
];

export function getCertificateFields(type: VesselType): CertificateFieldDef[] {
  return type === "boiler"
    ? BOILER_CERTIFICATE_FIELDS
    : TANK_CERTIFICATE_FIELDS;
}
