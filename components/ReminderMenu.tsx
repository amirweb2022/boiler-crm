"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toShamsiDisplay } from "../lib/date/shamsi";

interface Reminder {
  testRecordId: string;
  companyId: string;
  companyName: string;
  phone: string;
  testDate: string;
  remainingDays: number;
}

interface ReminderListResponse {
  reminders: Reminder[];
  date: string;
  serverTime: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

export default function ReminderMenu() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [list, setList] = useState<ReminderListResponse | null>(null);
  const [sendWindowOpen, setSendWindowOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ completed: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/sms/reminders", { cache: "no-store" });
    if (!response.ok) return;
    const data: ReminderListResponse = await response.json();
    setList(data);
    const pendingDayOne = data.reminders.filter((item) => item.remainingDays === 1).length;
    if (pendingDayOne > 0) {
      const key = `reminder-toast:${data.date}`;
      if (localStorage.getItem(key) !== "shown") {
        localStorage.setItem(key, "shown");
        setToast({
          kind: "info",
          text: `${pendingDayOne} یادآوریِ ارسال‌نشده برای آزمون فردا دارید.`,
        });
      }
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setIsAdmin(data.admin?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [isAdmin, refresh]);

  useEffect(() => {
    if (!list) return;
    const serverTimeAtSync = Date.parse(list.serverTime);
    const clientTimeAtSync = Date.now();
    const updateWindow = () => {
      const synchronizedNow = new Date(serverTimeAtSync + Date.now() - clientTimeAtSync);
      const hour = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        hourCycle: "h23",
      }).formatToParts(synchronizedNow).find((part) => part.type === "hour")?.value);
      setSendWindowOpen(hour >= 8 && hour < 22);
    };
    updateWindow();
    const timer = window.setInterval(updateWindow, 1_000);
    return () => window.clearInterval(timer);
  }, [list]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const canSend = sendWindowOpen;
  const reminders = list?.reminders ?? [];
  const isBusy = sendingId !== null || batch !== null;

  const reminderButtonClass = useMemo(() => {
    const base = "relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
    return reminders.length && canSend
      ? `${base} bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-300 animate-pulse hover:bg-amber-600`
      : `${base} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700`;
  }, [reminders.length, canSend]);

  if (!isAdmin) return null;

  async function sendOne(reminder: Reminder): Promise<SendResult> {
    try {
      const response = await fetch(`/api/sms/reminders/${reminder.testRecordId}`, { method: "POST" });
      const data = await response.json();
      return { success: response.ok && data.success === true, error: data.error };
    } catch {
      return { success: false, error: "ارتباط با سرور برقرار نشد" };
    }
  }

  async function handleSendOne(reminder: Reminder) {
    setSendingId(reminder.testRecordId);
    setToast(null);
    const result = await sendOne(reminder);
    setSendingId(null);
    if (result.success) {
      setToast({ kind: "success", text: `پیامک یادآوری برای ${reminder.companyName} ارسال شد.` });
    } else {
      setToast({ kind: "error", text: `ارسال برای ${reminder.companyName} ناموفق بود: ${result.error ?? "خطای نامشخص"}` });
    }
    await refresh();
  }

  async function handleSendAll() {
    if (isBusy || !reminders.length || !canSend) return;
    const queue = [...reminders];
    let succeeded = 0;
    let failed = 0;
    setToast(null);
    setBatch({ completed: 0, total: queue.length });
    for (const reminder of queue) {
      setSendingId(reminder.testRecordId);
      const result = await sendOne(reminder);
      if (result.success) {
        succeeded += 1;
      } else {
        failed += 1;
        setToast({ kind: "error", text: `ارسال برای ${reminder.companyName} ناموفق بود: ${result.error ?? "خطای نامشخص"}` });
      }
      setBatch((current) => current ? { ...current, completed: current.completed + 1 } : null);
    }
    setSendingId(null);
    setBatch(null);
    const kind = failed === 0 ? "success" : succeeded === 0 ? "error" : "info";
    setToast({ kind, text: `ارسال یادآوری پایان یافت: ${succeeded} موفق، ${failed} ناموفق.` });
    await refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={reminderButtonClass}
        disabled={!canSend || isBusy || reminders.length === 0}
        title={!canSend ? "ارسال پیامک فقط از ساعت ۰۸:۰۰ تا ۲۲:۰۰ به وقت تهران امکان‌پذیر است" : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" className="ml-1">⏰</span>
        ارسال پیامک یادآوری
        {reminders.length > 0 && <span className="mr-2 rounded-full bg-white/25 px-2 py-0.5">{reminders.length}</span>}
      </button>

      {open && (
        <div role="dialog" aria-label="یادآوری‌های پیامکی" className="absolute left-0 z-[70] mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">یادآوری‌های نیازمند ارسال</h2>
            <button type="button" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white" onClick={() => setOpen(false)}>بستن</button>
          </div>

          {reminders.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-slate-400">یادآوریِ در انتظار ارسالی وجود ندارد.</p>
          ) : (
            <>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {reminders.map((reminder) => (
                  <div key={reminder.testRecordId} className="rounded-lg border border-gray-100 p-3 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{reminder.companyName}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400" dir="ltr">{toShamsiDisplay(reminder.testDate)} · {reminder.phone}</p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{reminder.remainingDays === 1 ? "فردا" : "۲ روز دیگر"}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!canSend || isBusy}
                        onClick={() => void handleSendOne(reminder)}
                        className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {sendingId === reminder.testRecordId ? "در حال ارسال..." : "ارسال"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {batch && (
                <div className="mt-3" aria-live="polite">
                  <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-slate-300">
                    <span>در حال ارسال پیامک‌ها...</span><span>{batch.completed} از {batch.total}</span>
                  </div>
                  <progress className="h-2 w-full accent-brand-600" max={batch.total} value={batch.completed} />
                </div>
              )}
              <button
                type="button"
                disabled={!canSend || isBusy || reminders.length === 0}
                onClick={() => void handleSendAll()}
                className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {batch ? `در حال ارسال ${batch.completed} از ${batch.total}...` : "ارسال به همه"}
              </button>
              {!canSend && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-300">ارسال در حال حاضر مجاز نیست؛ ساعت مجاز تهران ۰۸:۰۰ تا ۲۲:۰۰ است.</p>}
            </>
          )}
        </div>
      )}

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={`fixed left-4 top-4 z-[100] max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg ${toast.kind === "error" ? "bg-red-600" : toast.kind === "success" ? "bg-green-600" : "bg-slate-700"}`}
        >
          {toast.text}
          <button type="button" aria-label="بستن پیام" className="mr-3 font-bold" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}
