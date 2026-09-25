import ExcelJS from "exceljs";
import { listTestHistoryForShamsiMonth } from "../db/test-history.repository";
import { getRegionMapDict } from "../db/region-map.repository";
import { toShamsiDisplay, SHAMSI_MONTH_NAMES } from "../date/shamsi";
import type { TestHistoryEntry } from "../../types";

// =====================================================================
// ساخت فایل اکسل گزارش ماهانه، دقیقاً مطابق قالب نمونه‌ای که کارفرما
// ارائه داد: یک شیت به‌ازای هر «منطقه» (نگاشت‌شده از استان، از جدول
// province_region_map)، هر شیت شامل عنوان + جدول با ستون‌های ثابت.
// وقتی چند مخزن هم‌نام و هم‌حجم در یک شرکت باشند، در یک ردیف با
// «تعداد» جمع‌شده نمایش داده می‌شوند (دقیقاً مطابق فایل نمونه).
// =====================================================================

const HEADER_VALUES = [
  "ردیف",
  "نام بررسی کننده",
  "شناسه ملی بررسی کننده",
  "نوع دیگ / مخزن",
  "ظرفیت",
  "استان",
  "شهرستان",
  "نام شرکت",
  "نشانی کامل شرکت و تلفن ",
  "تاریخ آزمایش",
  "تعداد",
  "",
  "نتیجه",
];
const COLUMN_COUNT = HEADER_VALUES.length;

interface AggregatedRow {
  companyName: string;
  province: string;
  city: string;
  addressAndPhone: string;
  vesselName: string;
  vesselVolume: string;
  testDate: string;
  count: number;
}

function aggregate(entries: TestHistoryEntry[]): AggregatedRow[] {
  const map = new Map<string, AggregatedRow>();
  for (const e of entries) {
    const key = `${e.companyName}||${e.vesselName}||${e.vesselVolume}||${e.testDate}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    map.set(key, {
      companyName: e.companyName,
      province: e.companyProvince,
      city: e.companyCity ?? "",
      addressAndPhone: [e.companyAddress, e.companyPhone].filter(Boolean).join("، "),
      vesselName: e.vesselName,
      vesselVolume: e.vesselVolume,
      testDate: e.testDate,
      count: 1,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.companyName.localeCompare(b.companyName, "fa"));
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

function styleDataRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  row.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
  row.getCell(9).alignment = { horizontal: "right", vertical: "middle", wrapText: true };
}

export async function buildMonthlyReportWorkbook(jYear: number, jMonth: number): Promise<ExcelJS.Workbook> {
  const entries = await listTestHistoryForShamsiMonth(jYear, jMonth);
  const regionMap = await getRegionMapDict();

  const inspectorName = process.env.REPORT_INSPECTOR_NAME ?? "—";
  const inspectorNationalId = process.env.REPORT_INSPECTOR_NATIONAL_ID ?? "—";
  const monthLabel = `${SHAMSI_MONTH_NAMES[jMonth - 1]} ${jYear}`;

  const byRegion = new Map<string, TestHistoryEntry[]>();
  for (const e of entries) {
    const region = regionMap[e.companyProvince] ?? e.companyProvince;
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(e);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "سامانه مدیریت آزمون دیگ بخار";
  workbook.created = new Date();

  if (byRegion.size === 0) {
    const ws = workbook.addWorksheet("گزارش", { views: [{ rightToLeft: true }] });
    ws.getCell("A1").value = `هیچ آزمون تکمیل‌شده‌ای در ${monthLabel} ثبت نشده است`;
    ws.getCell("A1").alignment = { horizontal: "center" };
    return workbook;
  }

  for (const [region, regionEntries] of byRegion) {
    // نام شیت اکسل حداکثر ۳۱ کاراکتر و بدون برخی کاراکترهای خاص مجاز است
    const sheetName = region.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "منطقه";
    const ws = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

    ws.columns = [
      { width: 6 },
      { width: 18 },
      { width: 16 },
      { width: 28 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 22 },
      { width: 38 },
      { width: 14 },
      { width: 8 },
      { width: 8 },
      { width: 10 },
    ];

    ws.mergeCells(1, 1, 1, COLUMN_COUNT);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `گزارش خدمات مشاوران در زمینه ارزیابی ایمنی ظروف تحت فشار ${monthLabel} ${region}`;
    titleCell.font = { bold: true, size: 13 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 26;

    const headerRow = ws.addRow(HEADER_VALUES);
    styleHeaderRow(headerRow);
    ws.mergeCells(headerRow.number, 11, headerRow.number, 12);

    const aggregated = aggregate(regionEntries);
    aggregated.forEach((row, idx) => {
      const dataRow = ws.addRow([
        idx + 1,
        inspectorName,
        inspectorNationalId,
        row.vesselName,
        row.vesselVolume,
        row.province,
        row.city,
        row.companyName,
        row.addressAndPhone,
        toShamsiDisplay(row.testDate),
        row.count,
        "دستگاه",
        "تأیید",
      ]);
      styleDataRow(dataRow);
    });
  }

  return workbook;
}
