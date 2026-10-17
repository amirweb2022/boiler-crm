"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Spinner } from "./ui";
import { useToast } from "./Toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const initial = { phone: "", fullName: "", password: "", passwordConfirmation: "", role: "admin" as "admin" | "tester" };

export default function UserRegistrationForm() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) { setError(json.error ?? "ساخت کاربر ناموفق بود"); return; }
      setForm(initial); showToast({ tone: "success", title: "کاربر ایجاد شد", description: "حساب کاربری فعال است و می‌تواند وارد سامانه شود." });
      router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setLoading(false); }
  }

  return <Card className="p-5 shadow-sm sm:p-8"><div className="mb-6"><h1 className="text-xl font-bold tracking-tight">ایجاد کاربر جدید</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">این فرم فقط برای مدیران سامانه در دسترس است.</p></div>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm">شماره موبایل<input className="input mt-1.5" dir="ltr" inputMode="numeric" placeholder="09121234567" value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
      <label className="text-sm">نام و نام خانوادگی<input className="input mt-1.5" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required maxLength={120} /></label>
      <label className="text-sm">رمز عبور<input className="input mt-1.5" type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} required /></label>
      <label className="text-sm">تکرار رمز عبور<input className="input mt-1.5" type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={(e) => update("passwordConfirmation", e.target.value)} required /></label>
      <label className="text-sm">نقش
        <Select value={form.role} onValueChange={(value) => update("role", value as "admin" | "tester")}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="admin">مدیر</SelectItem><SelectItem value="tester">بازرس</SelectItem></SelectContent>
        </Select>
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={loading}>{loading && <Spinner />}{loading ? "در حال ایجاد..." : "ایجاد کاربر"}</Button></div>
    </form>
  </Card>;
}
