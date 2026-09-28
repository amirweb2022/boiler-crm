"use client";

import { useEffect, useState, useCallback } from "react";

interface MonthInfo {
  jYear: number;
  jMonth: number;
  label: string;
}

interface RegionMapItem {
  id: string;
  province: string;
  regionName: string;
}

export default function MonthlyReports() {
  const [myRole, setMyRole] = useState<"admin" | "tester" | null | "loading">("loading");
  const [lastMonth, setLastMonth] = useState<MonthInfo | null>(null);
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  const [regionItems, setRegionItems] = useState<RegionMapItem[]>([]);
  const [newProvince, setNewProvince] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [savingRegion, setSavingRegion] = useState(false);

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

  const fetchRegionMap = useCallback(async () => {
    const res = await fetch("/api/region-map");
    if (!res.ok) return;
    const json = await res.json();
    setRegionItems(json.items ?? []);
  }, []);

  useEffect(() => {
    if (myRole === "admin") {
      fetchStatus();
      fetchRegionMap();
    }
  }, [myRole, fetchStatus, fetchRegionMap]);

  async function handleDownload(jYear: number, jMonth: number) {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/download?jYear=${jYear}&jMonth=${jMonth}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "خطا در ساخت گزارش");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `گزارش.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleAddRegion(e: React.FormEvent) {
    e.preventDefault();
    if (!newProvince.trim() || !newRegion.trim()) return;
    setSavingRegion(true);
    try {
      const res = await fetch("/api/region-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ province: newProvince.trim(), regionName: newRegion.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "خطا در ثبت نگاشت");
        return;
      }
      setNewProvince("");
      setNewRegion("");
      fetchRegionMap();
    } finally {
      setSavingRegion(false);
    }
  }

  async function handleDeleteRegion(id: string) {
    if (!confirm("این نگاشت حذف شود؟")) return;
    await fetch(`/api/region-map/${id}`, { method: "DELETE" });
    fetchRegionMap();
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
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="font-bold mb-1">گزارش ماهانه</h2>
        <p className="text-sm text-gray-500 dark:text-slate-300 mb-4">
          گزارش هر ماه از روز اول ماه بعد، برای دانلود آماده است.
        </p>

        {lastMonth ? (
          <button
            disabled={downloading}
            onClick={() => handleDownload(lastMonth.jYear, lastMonth.jMonth)}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg px-5 py-2.5 font-medium"
          >
            {downloading ? "در حال ساخت فایل..." : `دانلود گزارش ${lastMonth.label}`}
          </button>
        ) : (
          <p className="text-sm text-gray-400 dark:text-slate-400">در حال بارگذاری...</p>
        )}

        {/* دانلود ماه‌های دیگر */}
        {availableMonths.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-slate-300">گزارش ماه دیگر:</span>
            <select
              className="input w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">انتخاب کنید...</option>
              {availableMonths.map((m) => (
                <option key={`${m.jYear}-${m.jMonth}`} value={`${m.jYear}-${m.jMonth}`}>
                  {m.label}
                </option>
              ))}
            </select>
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

      {/* تنظیمات منطقه‌بندی */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="font-bold mb-1">نگاشت استان به منطقه گزارش</h2>
        <p className="text-sm text-gray-500 dark:text-slate-300 mb-4">
          مشخص کن هر استان توی گزارش، زیر کدام شیت/منطقه قرار بگیرد (مثلاً چند استان با هم زیر «شمال»).
          استانی که این‌جا تعریف نشود، با نام خودش شیت جدا می‌شود.
        </p>

        <form onSubmit={handleAddRegion} className="flex items-end gap-2 flex-wrap mb-5">
          <div>
            <label className="block text-xs text-gray-500 dark:text-slate-300 mb-1">استان</label>
            <input
              className="input w-auto"
              placeholder="مثال: گیلان"
              value={newProvince}
              onChange={(e) => setNewProvince(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-slate-300 mb-1">منطقه/شیت گزارش</label>
            <input
              className="input w-auto"
              placeholder="مثال: شمال"
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={savingRegion}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm rounded-lg px-4 py-2"
          >
            افزودن/آپدیت
          </button>
        </form>

        <div className="divide-y divide-gray-100 dark:divide-slate-700 border border-gray-100 dark:border-slate-700 rounded-lg">
          {regionItems.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-4">هنوز نگاشتی تعریف نشده</p>
          )}
          {regionItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                <span className="font-medium">{item.province}</span>
                <span className="text-gray-400 dark:text-slate-400"> ← </span>
                <span>{item.regionName}</span>
              </span>
              <button onClick={() => handleDeleteRegion(item.id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                حذف
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
