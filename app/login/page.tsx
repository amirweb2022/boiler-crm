"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCheck, LockKeyhole, Phone } from "lucide-react";
import ThemeMenu from "../../components/ThemeMenu";
import { Button, Card, Spinner } from "../../components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "خطا در ورود"); return; }
      router.push("/dashboard"); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setLoading(false); }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,hsl(var(--primary)/.12),transparent_34%),radial-gradient(ellipse_at_90%_85%,rgba(20,184,166,.12),transparent_34%)]" />
    <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6"><ThemeMenu /></div>
    <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] border bg-card shadow-2xl shadow-slate-900/10 md:grid-cols-[1fr_1.05fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
        <div aria-hidden="true" className="absolute -left-24 -top-24 size-80 rounded-full border border-white/15" /><div aria-hidden="true" className="absolute -left-12 -top-12 size-56 rounded-full border border-white/15" />
        <div className="relative flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><ClipboardCheck className="size-6" /></span><span className="text-lg font-extrabold">آزمایش‌یار</span></div>
        <div className="relative py-12"><p className="mb-4 text-xs font-bold tracking-widest text-white/70">مدیریت بازرسی تجهیزات</p><h2 className="text-3xl font-extrabold leading-[1.7]">همراه مطمئن<br />چرخه‌های بازرسی</h2><p className="mt-4 max-w-xs text-sm leading-7 text-white/75">پیگیری آزمون‌ها، گواهی‌ها و سررسیدها در یک فضای کاری یکپارچه.</p></div>
        <p className="relative text-xs text-white/60">سامانه مدیریت آزمون دیگ بخار و تجهیزات تحت فشار</p>
      </section>
      <Card className="rounded-none border-0 p-7 shadow-none sm:p-10 lg:p-12">
        <div className="mb-9 md:hidden"><span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><ClipboardCheck className="size-6" /></span><p className="text-sm font-bold text-primary">آزمایش‌یار</p></div>
        <div className="mb-8"><p className="mb-2 text-xs font-bold tracking-wide text-primary">خوش آمدید</p><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">ورود به سامانه</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">برای ادامه، اطلاعات حساب کاربری خود را وارد کنید.</p></div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="phone" className="mb-2 block text-sm font-semibold">شماره موبایل</label><div className="relative"><Phone className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="phone" name="phone" type="tel" inputMode="numeric" dir="ltr" autoComplete="tel" placeholder="09121234567" className="input h-12 pr-10 text-right" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-semibold">رمز عبور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input id="password" name="password" type="password" autoComplete="current-password" className="input h-12 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required /></div></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-sm">{loading ? <><Spinner />در حال ورود...</> : <>ورود به سامانه<ArrowLeft className="size-4" /></>}</Button>
        </form>
        <p className="mt-8 border-t pt-5 text-center text-xs text-muted-foreground">دسترسی فقط برای کاربران مجاز سامانه امکان‌پذیر است.</p>
      </Card>
    </div>
  </main>;
}
