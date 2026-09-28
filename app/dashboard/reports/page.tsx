import MonthlyReports from "../../../components/MonthlyReports";
import ThemeMenu from "../../../components/ThemeMenu";

export default function ReportsPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <a href="/dashboard" className="text-sm text-gray-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-blue-400">
            ← بازگشت به داشبورد
          </a>
          <h1 className="text-lg font-bold">گزارش‌های ماهانه</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeMenu />
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-300">خروج</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <MonthlyReports />
      </main>
    </div>
  );
}
