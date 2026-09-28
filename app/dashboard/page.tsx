import CompanyAccordion from "../../components/CompanyAccordion";
import ThemeMenu from "../../components/ThemeMenu";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">سامانه مدیریت آزمون دیگ بخار</h1>
        <div className="flex flex-wrap items-center gap-4">
          <ThemeMenu />
          <a href="/dashboard/reports" className="text-sm text-gray-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-blue-400">
            گزارش‌های ماهانه
          </a>
          <a href="/dashboard/history" className="text-sm text-gray-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-blue-400">
            تاریخچه تغییرات
          </a>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-300">خروج</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <CompanyAccordion />
      </main>
    </div>
  );
}
