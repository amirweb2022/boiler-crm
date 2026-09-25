// =====================================================================
// لایه انتزاعی تاریخ — تمام ذخیره‌سازی به میلادی (ISO) است.
// وابستگی: dayjs + jalaliday   (npm i dayjs jalaliday)
// =====================================================================
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

/** تبدیل timestamptz میلادی به تاریخ+ساعت شمسی (برای صفحه تاریخچه) */
export function toShamsiDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "—";
  return dayjs(isoDateTime).calendar("jalali").locale("fa").format("YYYY/MM/DD HH:mm");
}

export const SHAMSI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** ماه/سال شمسیِ امروز */
export function getCurrentShamsiYearMonth(): { jYear: number; jMonth: number } {
  const now = dayjs().calendar("jalali");
  return { jYear: now.year(), jMonth: now.month() + 1 };
}

/**
 * آخرین ماه شمسیِ «تمام‌شده» — یعنی همان ماهی که گزارشش باید همیشه
 * از روز اول ماه جاری آماده و قابل‌دانلود باشد.
 */
export function getLastCompletedShamsiMonth(): { jYear: number; jMonth: number } {
  const { jYear, jMonth } = getCurrentShamsiYearMonth();
  if (jMonth === 1) return { jYear: jYear - 1, jMonth: 12 };
  return { jYear, jMonth: jMonth - 1 };
}

export function shamsiMonthLabel(jYear: number, jMonth: number): string {
  return `${SHAMSI_MONTH_NAMES[jMonth - 1]} ${jYear}`;
}

/** تبدیل تاریخ میلادی ISO ("YYYY-MM-DD") به رشته نمایشی شمسی */
export function toShamsiDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return dayjs(isoDate).calendar("jalali").locale("fa").format("YYYY/MM/DD");
}

/**
 * تبدیل DateObject کتابخانه react-multi-date-picker (که کاربر از تقویم
 * شمسی انتخاب کرده) به رشته ISO میلادی برای ذخیره در دیتابیس.
 * از .toDate() خودِ کتابخانه استفاده می‌کنیم که تبدیل تقویمی را داخلی و
 * صحیح انجام می‌دهد؛ اجزای محلی (نه UTC) برای جلوگیری از خطای یک‌روزه.
 */
export function dateObjectToISO(dateObject: { toDate: () => Date }): string {
  const nativeDate = dateObject.toDate();
  const y = nativeDate.getFullYear();
  const m = String(nativeDate.getMonth() + 1).padStart(2, "0");
  const d = String(nativeDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** محاسبه سررسید سال بعد: همان روز/ماه شمسی، یک سال بعد */
export function nextYearShamsi(isoDate: string): string {
  const next = dayjs(isoDate).calendar("jalali").add(1, "year");
  return next.calendar("gregory").format("YYYY-MM-DD");
}

/** فاصله‌ی امروز تا تاریخ تست بر حسب روز */
export function daysUntil(isoDate: string): number {
  return dayjs(isoDate).startOf("day").diff(dayjs().startOf("day"), "day");
}

export type TestProximityThresholds = { nearDueDays: number };
export const DEFAULT_THRESHOLDS: TestProximityThresholds = { nearDueDays: 30 };

export function computeProximity(
  isoTestDate: string | null,
  status: "pending" | "done",
  thresholds = DEFAULT_THRESHOLDS
): "near_due" | "due" | "overdue" | "done" | "unscheduled" {
  if (!isoTestDate) return "unscheduled";
  if (status === "done") return "done";
  const diff = daysUntil(isoTestDate);
  if (diff < 0) return "overdue";
  if (diff <= 1) return "due";
  if (diff <= thresholds.nearDueDays) return "near_due";
  return "unscheduled";
}
