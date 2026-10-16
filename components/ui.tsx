import * as React from "react";

export function Button({ className = "", variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "ghost" | "destructive"; size?: "default" | "sm" }) {
  const variants = { default: "bg-indigo-600 text-white hover:bg-indigo-700", secondary: "bg-teal-600 text-white hover:bg-teal-700", ghost: "hover:bg-slate-100 dark:hover:bg-slate-800", destructive: "bg-red-600 text-white hover:bg-red-700" };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`} {...props} />; }
export function Badge({ className = "", tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = { neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", danger: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300", info: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`} {...props} />;
}
export function Spinner({ className = "" }: { className?: string }) { return <span aria-hidden="true" className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />; }
export function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />; }
export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div>{action}</div>; }
