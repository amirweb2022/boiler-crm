"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { Activity, ClipboardList, FileBarChart2, History, Menu, Users, X, LogOut } from "lucide-react";
import ThemeMenu from "./ThemeMenu";
import ReminderMenu from "./ReminderMenu";
import { Button } from "./ui";

const primaryNav = [
  { href: "/dashboard", label: "داشبورد", icon: Activity },
  { href: "/dashboard/reports", label: "گزارش‌های ماهانه", icon: FileBarChart2 },
  { href: "/dashboard/history", label: "تاریخچه تغییرات", icon: History },
];

export default function AppShell({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { fetch("/api/auth/me").then((response) => response.json()).then((data) => setIsAdmin(data.admin?.role === "admin")).catch(() => undefined); }, []);
  const nav = [...primaryNav, ...(isAdmin ? [{ href: "/dashboard/users", label: "مدیریت کاربران", icon: Users }] : [])];
  const navigation = <nav aria-label="ناوبری اصلی" className="space-y-1.5">{nav.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-[18px] shrink-0" strokeWidth={1.8} /><span>{label}</span>{active && <span className="mr-auto size-1.5 rounded-full bg-primary" />}</Link>;
  })}</nav>;
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-[17rem] border-l bg-card px-5 py-6 lg:flex lg:flex-col">
      <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-1"><span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><ClipboardList className="size-5" /></span><span><span className="block text-base font-extrabold tracking-tight">آزمایش‌یار</span><span className="mt-0.5 block text-xs text-muted-foreground">مدیریت بازرسی تجهیزات</span></span></Link>
      <p className="mb-2 px-3 text-[11px] font-bold tracking-wide text-muted-foreground">منوی اصلی</p>{navigation}
      <div className="mt-auto rounded-2xl border bg-muted/50 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold"><Activity className="size-4 text-primary" />چرخه‌های بازرسی</div><p className="text-xs leading-6 text-muted-foreground">وضعیت آزمون‌ها را از یک نمای واحد پیگیری کنید.</p></div>
    </aside>
    {open && <button aria-label="بستن منو" className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 right-0 z-50 flex w-[min(18rem,88vw)] flex-col border-l bg-card px-5 py-6 shadow-2xl transition-transform duration-200 lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!open}>
      <div className="mb-8 flex items-center justify-between"><Link href="/dashboard" className="flex items-center gap-3 font-extrabold"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><ClipboardList className="size-5" /></span>آزمایش‌یار</Link><Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="بستن منو"><X className="size-4" /></Button></div>{navigation}
    </aside>
    <div className="min-w-0 lg:pr-[17rem]">
      <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="باز کردن منو"><Menu className="size-4" /></Button><div className="min-w-0"><h1 className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</h1>{description && <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{description}</p>}</div></div>
        <div className="flex shrink-0 items-center gap-2"><ReminderMenu /><ThemeMenu /><form action="/api/auth/logout" method="post"><Button variant="ghost" size="sm" className="gap-2"><LogOut className="size-4" /><span className="hidden sm:inline">خروج</span></Button></form></div>
      </div></header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  </div>;
}
