import { Badge, Card } from "./ui";
import { toShamsiDateTime } from "../lib/date/shamsi";
import type { Admin } from "../types";

export default function UserListTable({ users }: { users: Admin[] }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">فهرست کاربران</h2>
      </div>
      {users.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">هیچ کاربری ثبت نشده است.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">نام</th>
                <th scope="col" className="px-5 py-3 font-semibold">شماره موبایل</th>
                <th scope="col" className="px-5 py-3 font-semibold">نقش</th>
                <th scope="col" className="px-5 py-3 font-semibold">وضعیت</th>
                <th scope="col" className="px-5 py-3 font-semibold">تاریخ ایجاد</th>
                <th scope="col" className="px-5 py-3 font-semibold">آخرین ورود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-5 py-3.5">{user.fullName || "—"}</td>
                  <td className="px-5 py-3.5" dir="ltr">{user.phone}</td>
                  <td className="px-5 py-3.5">{user.role === "admin" ? "مدیر" : "بازرس"}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5" dir="ltr">{toShamsiDateTime(user.createdAt)}</td>
                  <td className="px-5 py-3.5" dir="ltr">{toShamsiDateTime(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
