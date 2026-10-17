"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Button } from "./ui";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

type Toast = { id: number; title: string; description?: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<{ showToast: (toast: Omit<Toast, "id">) => void }>({ showToast: () => undefined });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((toast: Omit<Toast, "id">) => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { ...toast, id }]); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500); }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="fixed left-4 top-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{toasts.map((toast) => { const Icon = toast.tone === "success" ? CircleCheck : toast.tone === "error" ? CircleAlert : Info; return <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={`rounded-2xl border bg-card p-4 text-card-foreground shadow-xl shadow-slate-950/10 backdrop-blur ${toast.tone === "success" ? "border-emerald-200 dark:border-emerald-900" : toast.tone === "error" ? "border-red-200 dark:border-red-900" : "border-primary/20"}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><Icon className={`mt-0.5 size-4 shrink-0 ${toast.tone === "success" ? "text-emerald-600" : toast.tone === "error" ? "text-red-600" : "text-primary"}`} /><div><p className="text-sm font-semibold">{toast.title}</p>{toast.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{toast.description}</p>}</div></div><Button variant="ghost" size="icon" className="-mt-1 size-7" aria-label="بستن پیام" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X className="size-4" /></Button></div></div>; })}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
