import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import AppShell from "../../../components/AppShell";
import UserListTable from "../../../components/UserListTable";
import UserRegistrationForm from "../../../components/UserRegistrationForm";
import { requireRole } from "../../../lib/auth";
import { listUsers } from "../../../lib/db/users.repository";

export default async function UsersPage() {
  try { await requireRole("admin"); } catch { redirect("/dashboard"); }
  const users = await listUsers();
  return <AppShell title="مدیریت کاربران" description="ایجاد حساب‌های فعال برای اعضای تیم بازرسی">
    <div className="mb-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="size-5" /></span><div><h2 className="text-xl font-bold tracking-tight">دسترسی‌های تیم</h2><p className="mt-1 text-sm text-muted-foreground">حساب‌های فعال و نقش‌های سامانه را مدیریت کنید.</p></div></div>
    <UserRegistrationForm />
    <UserListTable users={users} />
  </AppShell>;
}
