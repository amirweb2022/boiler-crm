import { FileBarChart2 } from "lucide-react";
import AppShell from "../../../components/AppShell";
import MonthlyReports from "../../../components/MonthlyReports";
import { SectionHeading } from "../../../components/ui";

export default function ReportsPage() {
  return <AppShell title="گزارش‌های ماهانه" description="خروجی رسمی آزمون‌های انجام‌شده را دریافت کنید">
    <SectionHeading eyebrow="گزارش‌دهی" title="گزارش‌های بازرسی" description="گزارش هر ماه شمسی را دریافت و سوابق بازرسی را مرور کنید." action={<span className="hidden size-12 place-items-center rounded-2xl border bg-card text-primary sm:grid"><FileBarChart2 className="size-5" /></span>} />
    <MonthlyReports />
  </AppShell>;
}
