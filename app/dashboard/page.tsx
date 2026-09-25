import CompanyAccordion from "../../components/CompanyAccordion";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">سامانه مدیریت آزمون دیگ بخار</h1>
        <div className="flex items-center gap-4">
          <a href="/dashboard/reports" className="text-sm text-gray-500 hover:text-brand-600">
            گزارش‌های ماهانه
          </a>
          <a href="/dashboard/history" className="text-sm text-gray-500 hover:text-brand-600">
            تاریخچه تغییرات
          </a>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-500 hover:text-red-600">خروج</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <CompanyAccordion />
      </main>
    </div>
  );
}
