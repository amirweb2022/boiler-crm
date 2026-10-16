import MonthlyReports from "../../../components/MonthlyReports";
import ThemeMenu from "../../../components/ThemeMenu";
import AppShell from "../../../components/AppShell";

export default function ReportsPage() {
  return <AppShell title="گزارش‌های ماهانه" description="خروجی رسمی آزمون‌های انجام‌شده را دریافت کنید">
        <MonthlyReports />
    </AppShell>;
}
