import AppShell from "../../../components/AppShell";
import UserRegistrationForm from "../../../components/UserRegistrationForm";
import { requireRole } from "../../../lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  try { await requireRole("admin"); } catch { redirect("/dashboard"); }
  return <AppShell title="مدیریت کاربران" description="ایجاد حساب‌های فعال برای اعضای تیم بازرسی">
    <UserRegistrationForm />
  </AppShell>;
}
