import { ClipboardList, Search } from "lucide-react";
import CompanyAccordion from "../../components/CompanyAccordion";
import AppShell from "../../components/AppShell";
import { Card, SectionHeading } from "../../components/ui";
import DashboardStats from "../../components/DashboardStats";

export default function DashboardPage() {
  return <AppShell title="داشبورد" description="نمای کلی چرخه‌های بازرسی و صف کار تیم شما">
    <SectionHeading eyebrow="مرکز عملیات" title="مدیریت آزمون‌ها" description="شرکت‌ها، تجهیزات، گواهی‌ها و سررسیدها را از یکجا پیگیری کنید." />
    <DashboardStats />
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-5" /></span><div><h2 className="font-bold">صف بازرسی شرکت‌ها</h2><p className="mt-0.5 text-xs text-muted-foreground">وضعیت چرخه و تجهیزات هر شرکت را بررسی کنید.</p></div></div><span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><Search className="size-3.5" />جستجو و فیلتر</span></div>
      <div className="p-4 sm:p-6"><CompanyAccordion /></div>
    </Card>
  </AppShell>;
}
