import MonthlyReports from "../../../components/MonthlyReports";

export default function ReportsPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-brand-600">
            ← بازگشت به داشبورد
          </a>
          <h1 className="text-lg font-bold">گزارش‌های ماهانه</h1>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="text-sm text-gray-500 hover:text-red-600">خروج</button>
        </form>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <MonthlyReports />
      </main>
    </div>
  );
}
