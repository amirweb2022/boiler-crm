import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap" });

export const metadata: Metadata = {
  title: "سامانه مدیریت آزمون دیگ بخار",
  description: "داشبورد مدیریت آزمون دوره‌ای دیگ‌های بخار و مخازن تحت فشار",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} font-vazir bg-gray-50 text-gray-900`}>{children}</body>
    </html>
  );
}
