
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ThemeMenu from "../../components/ThemeMenu";
import { Button, Card, Spinner } from "../../components/ui";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "خطا در ورود");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 dark:bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(13,148,136,0.14),_transparent_35%)]" />

      <div className="absolute left-4 top-4">
        <ThemeMenu />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md"
      >
        <Card className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg shadow-indigo-600/25">
              ♨
            </div>

            <h1 className="text-2xl font-bold">ورود به سامانه</h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              مدیریت آزمون دیگ بخار و تجهیزات تحت فشار
            </p>
          </div>

          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm text-gray-700 dark:text-slate-200"
          >
            شماره موبایل
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            dir="ltr"
            autoComplete="tel"
            placeholder="09121234567"
            className="input mb-5 text-right"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <label
            htmlFor="password"
            className="mb-1.5 block text-sm text-gray-700 dark:text-slate-200"
          >
            رمز عبور
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input mb-5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading && <Spinner />}
            {loading ? "در حال ورود..." : "ورود به سامانه"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
