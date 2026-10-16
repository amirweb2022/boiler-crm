import AuditLogList from "../../../components/AuditLogList";
import ThemeMenu from "../../../components/ThemeMenu";
import AppShell from "../../../components/AppShell";

export default function HistoryPage() {
  return <AppShell title="تاریخچه تغییرات" description="ردپای عملیات انجام‌شده در سامانه">
        <AuditLogList />
    </AppShell>;
}
