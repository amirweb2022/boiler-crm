import { History } from "lucide-react";
import AppShell from "../../../components/AppShell";
import AuditLogList from "../../../components/AuditLogList";
import { SectionHeading } from "../../../components/ui";

export default function HistoryPage() {
  return <AppShell title="تاریخچه تغییرات" description="ردپای عملیات انجام‌شده در سامانه">
    <SectionHeading eyebrow="حسابرسی" title="تاریخچه فعالیت‌ها" description="رویدادهای ثبت‌شده را بر اساس کاربر، نوع عملیات و رکورد مرور کنید." action={<span className="hidden size-12 place-items-center rounded-2xl border bg-card text-primary sm:grid"><History className="size-5" /></span>} />
    <AuditLogList />
  </AppShell>;
}
