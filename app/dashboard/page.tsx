import CompanyAccordion from "../../components/CompanyAccordion";
import ThemeMenu from "../../components/ThemeMenu";
import ReminderMenu from "../../components/ReminderMenu";
import AppShell from "../../components/AppShell";
import { Card, SectionHeading, Badge } from "../../components/ui";
import DashboardStats from "../../components/DashboardStats";

export default function DashboardPage() {
  return <AppShell title="داشبورد" description="نمای کلی چرخه‌های بازرسی و صف کار تیم شما">
      <SectionHeading eyebrow="مرکز عملیات" title="مدیریت آزمون‌ها" description="شرکت‌ها، تجهیزات، گواهی‌ها و سررسیدها را از اینجا پیگیری کنید." />
      <DashboardStats />
      <Card className="p-4 sm:p-6">
        <CompanyAccordion />
      </Card>
    </AppShell>;
}
