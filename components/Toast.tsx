"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Button } from "./ui";

type Toast = { id: number; title: string; description?: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<{ showToast: (toast: Omit<Toast, "id">) => void }>({ showToast: () => undefined });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((toast: Omit<Toast, "id">) => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { ...toast, id }]); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500); }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="fixed left-4 top-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 shadow-xl backdrop-blur ${toast.tone === "success" ? "border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-100" : toast.tone === "error" ? "border-red-200 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/95 dark:text-red-100" : "border-indigo-200 bg-white/95 text-slate-900 dark:border-indigo-900 dark:bg-slate-900/95 dark:text-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{toast.title}</p>{toast.description && <p className="mt-1 text-xs opacity-80">{toast.description}</p>}</div><Button variant="ghost" size="sm" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</Button></div></div>)}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
