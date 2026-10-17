import AppShell from "../../../components/AppShell";
import UserRegistrationForm from "../../../components/UserRegistrationForm";
import UserListTable from "../../../components/UserListTable";
import { requireRole } from "../../../lib/auth";
import { listUsers } from "../../../lib/db/users.repository";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  try { await requireRole("admin"); } catch { redirect("/dashboard"); }
  const users = await listUsers();
  return <AppShell title="مدیریت کاربران" description="ایجاد حساب‌های فعال برای اعضای تیم بازرسی">
    <UserRegistrationForm />
    <UserListTable users={users} />
  </AppShell>;
}
