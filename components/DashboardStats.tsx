"use client";

import { useEffect, useState } from "react";
import { Activity, Award, CheckCircle2, Clock3 } from "lucide-react";
import { Badge, Card } from "./ui";

type Stats = { currentCycles: number; nearDue: number; completedCycles: number; activeCertificates: number };
const cards = [
  { key: "currentCycles", label: "چرخه‌های جاری", caption: "در انتظار بررسی", tone: "info" as const, icon: Activity, iconStyle: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { key: "nearDue", label: "نزدیک سررسید", caption: "نیازمند پیگیری", tone: "warning" as const, icon: Clock3, iconStyle: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { key: "completedCycles", label: "آزمون‌های تکمیل‌شده", caption: "در این دوره", tone: "success" as const, icon: CheckCircle2, iconStyle: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { key: "activeCertificates", label: "گواهی‌های فعال", caption: "همگام با سامانه", tone: "neutral" as const, icon: Award, iconStyle: "bg-primary/10 text-primary" },
];

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/dashboard/stats").then((response) => response.ok ? response.json() : null).then(setStats).catch(() => undefined); }, []);
  const value = (n: number | undefined) => n == null ? "—" : n.toLocaleString("fa-IR");
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ key, label, caption, tone, icon: Icon, iconStyle }) => <Card key={key} className="relative overflow-hidden p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{value(stats?.[key as keyof Stats])}</p></div><span className={`grid size-11 place-items-center rounded-xl ${iconStyle}`}><Icon className="size-5" strokeWidth={1.8} /></span></div><Badge tone={tone} className="mt-4">{caption}</Badge></Card>)}</div>;
}
