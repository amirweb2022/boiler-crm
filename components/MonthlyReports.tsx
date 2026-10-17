"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "./Toast";
import { Spinner } from "./ui";
import { CalendarDays, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MonthInfo {
  jYear: number;
  jMonth: number;
  label: string;
}

export default function MonthlyReports() {
  const { showToast } = useToast();
  const [myRole, setMyRole] = useState<"admin" | "tester" | null | "loading">("loading");
  const [lastMonth, setLastMonth] = useState<MonthInfo | null>(null);
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => setMyRole(json.admin?.role ?? null))
      .catch(() => setMyRole(null));
  }, []);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/reports/status");
    if (!res.ok) return;
    const json = await res.json();
    setLastMonth(json.lastCompletedMonth);
    setAvailableMonths(json.availableMonths ?? []);
  }, []);

  useEffect(() => {
    if (myRole === "admin") {
      fetchStatus();
    }
  }, [myRole, fetchStatus]);

  async function handleDownload(jYear: number, jMonth: number) {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/download?jYear=${jYear}&jMonth=${jMonth}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast({ tone: "error", title: "ساخت گزارش ناموفق بود", description: json.error });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (myRole === "loading") {
    return <p className="text-center text-gray-400 dark:text-slate-400 py-8">در حال بررسی دسترسی...</p>;
  }
  if (myRole !== "admin") {
    return (
      <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 rounded-lg px-4 py-3">
        شما دسترسی به بخش گزارش‌ها را ندارید — این بخش فقط برای نقش «admin» است.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* دانلود گزارش ماه اخیر */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="size-5" /></span><h2 className="font-bold">گزارش ماهانه</h2></div>
        <p className="text-sm text-gray-500 dark:text-slate-300 mb-4">
          گزارش هر ماه از روز اول ماه بعد، برای دانلود آماده است.
        </p>

        {lastMonth ? (
          <button
            disabled={downloading}
            onClick={() => handleDownload(lastMonth.jYear, lastMonth.jMonth)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? <Spinner /> : <Download className="size-4" />}{downloading ? "در حال ساخت فایل..." : `دانلود گزارش ${lastMonth.label}`}
          </button>
        ) : (
          <p className="text-sm text-gray-400 dark:text-slate-400">در حال بارگذاری...</p>
        )}

        {/* دانلود ماه‌های دیگر */}
        {availableMonths.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-slate-300">گزارش ماه دیگر:</span>
            <Select
              value={selectedMonth || undefined}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-full sm:w-auto"><SelectValue placeholder="انتخاب کنید..." /></SelectTrigger>
              <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={`${m.jYear}-${m.jMonth}`} value={`${m.jYear}-${m.jMonth}`}>
                  {m.label}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
            <button
              disabled={!selectedMonth || downloading}
              onClick={() => {
                const [jYear, jMonth] = selectedMonth.split("-").map(Number);
                handleDownload(jYear, jMonth);
              }}
              className="text-sm bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg px-4 py-2"
            >
              دانلود
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
