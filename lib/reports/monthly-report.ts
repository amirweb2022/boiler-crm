import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { listTestHistoryForShamsiMonth } from "../db/test-history.repository";
import { toShamsiDisplay, SHAMSI_MONTH_NAMES } from "../date/shamsi";
import type { TestHistoryEntry, VesselType } from "../../types";

const TEMPLATE_PATH = path.join(process.cwd(), "data", "گزارش تست مهر ماه1404.xlsx");
const PRESSURE_SHEET = "دیگ بخار و مخزن";
const LIFT_SHEET = "بالابر";
const FORKLIFT_SHEET = "لیفتراک";
const GROUNDING_SHEET = "ارت";

interface ReportRow {
  entry: TestHistoryEntry;
  deviceName: string;
  capacity: string;
  count: number;
}

interface GroundingReportRow {
  entry: TestHistoryEntry;
  systemType: string;
  wellCount: string | number;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function inspectorValues() {
  return {
    name: process.env.REPORT_INSPECTOR_NAME ?? "—",
    nationalId: process.env.REPORT_INSPECTOR_NATIONAL_ID ?? "—",
  };
}

function companyAddress(entry: TestHistoryEntry): string {
  return [entry.companyAddress, entry.companyPhone].filter(Boolean).join("، ");
}

function reportSheetFor(type: VesselType | null): string {
  switch (type) {
    case "lift": return LIFT_SHEET;
    case "forklift": return FORKLIFT_SHEET;
    case "grounding": return GROUNDING_SHEET;
    default: return PRESSURE_SHEET;
  }
}

function deviceFields(entry: TestHistoryEntry): { name: string; capacity: string } {
  const details = entry.vesselDetails as Record<string, unknown>;
  switch (entry.vesselType) {
    case "lift":
      return { name: text(details.liftType), capacity: text(details.capacityAndModel) };
    case "forklift":
      return { name: text(details.forkliftType), capacity: text(details.capacity) };
    case "grounding":
      return { name: text(details.groundingSystemType), capacity: `${text(details.wellCount)} حلقه` };
    case "boiler":
    case "tank":
    case null:
      return {
        name: entry.vesselName ?? (entry.vesselType === "boiler" ? "دیگ بخار" : "مخزن"),
        capacity: entry.vesselVolume ?? "",
      };
  }
}

function aggregationKey(entry: TestHistoryEntry, name: string, capacity: string): string {
  return [entry.companyId ?? entry.companyName, entry.vesselType, name, capacity, entry.testDate].join("\u0000");
}

function aggregate(entries: TestHistoryEntry[]): ReportRow[] {
  const rows = new Map<string, ReportRow>();
  for (const entry of entries) {
    const { name, capacity } = deviceFields(entry);
    const key = aggregationKey(entry, name, capacity);
    const existing = rows.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      rows.set(key, { entry, deviceName: name, capacity, count: 1 });
    }
  }
  return [...rows.values()];
}

function reportRows(entries: TestHistoryEntry[]): Map<string, ReportRow[]> {
  const grouped = new Map<string, TestHistoryEntry[]>();
  for (const entry of entries) {
    const sheet = reportSheetFor(entry.vesselType);
    const sheetEntries = grouped.get(sheet) ?? [];
    sheetEntries.push(entry);
    grouped.set(sheet, sheetEntries);
  }

  const result = new Map<string, ReportRow[]>();
  for (const sheet of [PRESSURE_SHEET, LIFT_SHEET, FORKLIFT_SHEET]) {
    result.set(sheet, aggregate(grouped.get(sheet) ?? []));
  }
  return result;
}

function groundingRows(entries: TestHistoryEntry[]): GroundingReportRow[] {
  return entries
    .filter((entry) => entry.vesselType === "grounding")
    .map((entry) => {
      const details = entry.vesselDetails as Record<string, unknown>;
      return {
        entry,
        systemType: text(details.groundingSystemType),
        wellCount: typeof details.wellCount === "number" ? details.wellCount : text(details.wellCount),
      };
    });
}

function rowStyles(row: ExcelJS.Row, columnCount: number): ExcelJS.Style[] {
  return Array.from({ length: columnCount }, (_, index) =>
    structuredClone(row.getCell(index + 1).style),
  );
}

function writeRows<T>(
  worksheet: ExcelJS.Worksheet,
  rows: T[],
  makeValues: (row: T, index: number) => unknown[],
): void {
  const columnCount = worksheet.columnCount;
  const originalLastRow = worksheet.rowCount;
  const styleTemplate = rowStyles(worksheet.getRow(3), columnCount);

  for (let rowNumber = 3; rowNumber <= originalLastRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let column = 1; column <= columnCount; column += 1) {
      row.getCell(column).value = null;
    }
  }

  rows.forEach((reportRow, index) => {
    const rowNumber = index + 3;
    const row = worksheet.getRow(rowNumber);
    styleTemplate.forEach((style, styleIndex) => {
      row.getCell(styleIndex + 1).style = structuredClone(style);
    });
    if (rowNumber > originalLastRow) {
      row.height = worksheet.getRow(3).height;
    }
    makeValues(reportRow, index).forEach((value, columnIndex) => {
      row.getCell(columnIndex + 1).value = value as ExcelJS.CellValue;
    });
  });

  // ExcelJS spliceRows does not truncate its backing row array when removing trailing rows.
  // Trim the loaded template rows directly so the exported sheet has only its headers and data.
  (worksheet as unknown as { _rows: unknown[] })._rows.length = rows.length + 2;
}

function commonValues(rowNumber: number): unknown[] {
  const inspector = inspectorValues();
  return [
    rowNumber,
    inspector.name,
    inspector.nationalId,
  ];
}

function standardValues(row: ReportRow, index: number): unknown[] {
  const entry = row.entry;
  return [
    ...commonValues(index + 1),
    row.deviceName,
    row.capacity,
    entry.companyProvince,
    entry.companyCity ?? "",
    entry.companyName,
    companyAddress(entry),
    toShamsiDisplay(entry.testDate),
    row.count,
    "دستگاه",
    entry.result === "approved" ? "تأیید" : entry.result,
  ];
}

function groundingValues(row: GroundingReportRow, index: number): unknown[] {
  const entry = row.entry;
  return [
    ...commonValues(index + 1),
    row.systemType,
    row.wellCount,
    "حلقه",
    entry.companyProvince,
    entry.companyCity ?? "",
    entry.companyName,
    companyAddress(entry),
    toShamsiDisplay(entry.testDate),
    entry.result === "approved" ? "تأیید" : entry.result,
  ];
}

export async function buildMonthlyReportWorkbook(jYear: number, jMonth: number): Promise<ExcelJS.Workbook> {
  const [entries, template] = await Promise.all([
    listTestHistoryForShamsiMonth(jYear, jMonth),
    readFile(TEMPLATE_PATH),
  ]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template);

  const period = `${SHAMSI_MONTH_NAMES[jMonth - 1]} ماه ${jYear}`;
  const pressureTitle = `گزارش خدمات مشاوران در زمینه ارزیابی ایمنی ظروف تحت فشار ${period}`;
  const titles: Record<string, string> = {
    [PRESSURE_SHEET]: pressureTitle,
    [LIFT_SHEET]: pressureTitle,
    [FORKLIFT_SHEET]: pressureTitle,
    [GROUNDING_SHEET]: `گزارش خدمات مشاوران در زمینه تخصصی ارزیابی ایمنی برق ${period}`,
  };

  workbook.creator = "سامانه مدیریت آزمون دیگ بخار";
  workbook.created = new Date();
  for (const worksheet of workbook.worksheets) {
    worksheet.getCell("A1").value = titles[worksheet.name];
  }

  const regularRows = reportRows(entries);
  for (const sheetName of [PRESSURE_SHEET, LIFT_SHEET, FORKLIFT_SHEET]) {
    const worksheet = workbook.getWorksheet(sheetName)!;
    writeRows(worksheet, regularRows.get(sheetName) ?? [], standardValues);
  }

  const groundingWorksheet = workbook.getWorksheet(GROUNDING_SHEET)!;
  writeRows(groundingWorksheet, groundingRows(entries), groundingValues);

  return workbook;
}
