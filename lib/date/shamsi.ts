// =====================================================================
// لایه انتزاعی تاریخ — تمام ذخیره‌سازی به میلادی (ISO) است.
// تبدیل تقویم با react-date-object، هماهنگ با تقویم فرم‌ها.
// =====================================================================
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import { calendarDaysUntil, getTehranClock } from "../sms/reminder-policy";

export function persianDate(isoDate: string) {
  return new DateObject({ date: isoDate, format: "YYYY-MM-DD", calendar: gregorian }).convert(persian);
}

/** تبدیل timestamptz میلادی به تاریخ+ساعت شمسی (برای صفحه تاریخچه) */
export function toShamsiDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "—";
  const instant = new Date(isoDateTime);
  const { date } = getTehranClock(instant);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
  return `${toShamsiDisplay(date)} ${time}`;
}

export const SHAMSI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** ماه/سال شمسیِ امروز */
export function getCurrentShamsiYearMonth(): { jYear: number; jMonth: number } {
  const now = persianDate(getTehranClock().date);
  return { jYear: now.year, jMonth: now.month.number };
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
  return persianDate(isoDate).format("YYYY/MM/DD");
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
  const current = persianDate(isoDate);
  const next = new DateObject({ year: current.year + 1, month: current.month.number, day: 1, calendar: persian });
  next.setDay(Math.min(current.day, next.month.length));
  return next.convert(gregorian).format("YYYY-MM-DD");
}

/** فاصله‌ی امروز تا تاریخ تست بر حسب روز */
export function daysUntil(isoDate: string): number {
  return calendarDaysUntil(isoDate, getTehranClock().date);
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
