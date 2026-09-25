"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "خطا در ورود");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-center mb-1">ورود مدیر سیستم</h1>
        <p className="text-sm text-gray-500 text-center mb-6">سامانه مدیریت آزمون دیگ بخار</p>

        <label className="block text-sm mb-1.5 text-gray-700">شماره موبایل</label>
        <input
          type="tel"
          inputMode="numeric"
          dir="ltr"
          placeholder="09121234567"
          className="input mb-4 text-right"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <label className="block text-sm mb-1.5 text-gray-700">رمزعبور</label>
        <input
          type="password"
          className="input mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 font-medium transition"
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </div>
  );
}
