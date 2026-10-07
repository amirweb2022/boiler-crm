export const REMINDER_TIME_ZONE = "Asia/Tehran";

export function getTehranClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export function calendarDaysUntil(dueDate: string, today: string) {
  return Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  );
}

export function isReminderSendTime(now = new Date()) {
  const { hour } = getTehranClock(now);
  return hour >= 8 && hour < 22;
}

export function reminderDateRange(today: string) {
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000)
    .toISOString().slice(0, 10);
  const dayAfterTomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 86400000)
    .toISOString().slice(0, 10);
  return { tomorrow, dayAfterTomorrow };
}
