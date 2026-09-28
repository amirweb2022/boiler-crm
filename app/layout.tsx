import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const initializeTheme = `(function(){try{var saved=localStorage.getItem('boiler-crm-theme');var theme=['light','dark','system'].includes(saved)?saved:'system';document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark'||theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){document.documentElement.dataset.theme='system';document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)}})();`;

const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap" });

export const metadata: Metadata = {
  title: "سامانه مدیریت آزمون دیگ بخار",
  description: "داشبورد مدیریت آزمون دوره‌ای دیگ‌های بخار و مخازن تحت فشار",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initializeTheme }} /></head>
      <body className={`${vazirmatn.variable} font-vazir bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100`}>{children}</body>
    </html>
  );
}
