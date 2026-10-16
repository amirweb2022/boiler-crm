"use client";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import ThemeMenu from "./ThemeMenu";
import ReminderMenu from "./ReminderMenu";
import { Button } from "./ui";

export default function AppShell({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { fetch("/api/auth/me").then((response) => response.json()).then((data) => setIsAdmin(data.admin?.role === "admin")).catch(() => undefined); }, []);
  const nav = [{ href: "/dashboard", label: "داشبورد", icon: "⌂" }, { href: "/dashboard/reports", label: "گزارش‌های ماهانه", icon: "▤" }, { href: "/dashboard/history", label: "تاریخچه تغییرات", icon: "◷" }, ...(isAdmin ? [{ href: "/dashboard/users", label: "مدیریت کاربران", icon: "☻" }] : [])];
  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="mb-8"><div className="mb-2 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-xl text-white">⚙</div><div><p className="font-bold">آزمایش‌یار</p><p className="text-xs text-slate-500">مدیریت بازرسی تجهیزات</p></div></div></div>
        <nav className="space-y-1">{nav.map(item => <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"><span className="w-5 text-center text-lg">{item.icon}</span>{item.label}</Link>)}</nav>
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-600 p-4 text-white"><p className="text-sm font-semibold">چرخه‌های بازرسی</p><p className="mt-1 text-xs text-indigo-100">وضعیت آزمون‌ها را از یک نمای واحد پیگیری کنید.</p></div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 border-l border-slate-200 bg-white p-5 shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-900 lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between"><span className="font-bold">آزمایش‌یار</span><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>×</Button></div>
        <nav className="space-y-1">{nav.map(item => <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40"><span>{item.icon}</span>{item.label}</Link>)}</nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو">☰</Button><div><p className="text-lg font-bold">{title}</p>{description && <p className="hidden text-xs text-slate-500 sm:block">{description}</p>}</div></div><div className="flex items-center gap-2"><ReminderMenu /><ThemeMenu /><form action="/api/auth/logout" method="post"><Button variant="ghost" size="sm">خروج</Button></form></div></div></header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  </div>;
}


