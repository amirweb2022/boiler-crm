"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "./ui";

type Stats = { currentCycles: number; nearDue: number; completedCycles: number; activeCertificates: number };

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch("/api/dashboard/stats").then((response) => response.ok ? response.json() : null).then(setStats).catch(() => undefined);
  }, []);
  const value = (n: number | undefined) => n == null ? "—" : n.toLocaleString("fa-IR");
  const cards = [
    ["چرخه‌های جاری", stats?.currentCycles, "text-slate-900", "info", "در انتظار بررسی"],
    ["نزدیک سررسید", stats?.nearDue, "text-amber-600", "warning", "نیازمند پیگیری"],
    ["آزمون‌های تکمیل‌شده", stats?.completedCycles, "text-emerald-600", "success", "این دوره"],
    ["گواهی‌های فعال", stats?.activeCertificates, "text-teal-600", "neutral", "همگام با سامانه"],
  ] as const;
  return <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, count, color, tone, badge]) => <Card key={label} className="p-5"><p className="text-sm text-slate-500">{label}</p><p className={`mt-3 text-3xl font-bold ${color}`}>{value(count)}</p><Badge tone={tone} className="mt-3">{badge}</Badge></Card>)}</div>;
}
