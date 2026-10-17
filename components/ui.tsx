import * as React from "react";
import { cn } from "../lib/utils";

const buttonVariants = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
};
const buttonSizes = { default: "h-10 px-4 py-2", sm: "h-9 rounded-lg px-3 text-xs", icon: "size-10" };

export function Button({ className = "", variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes }) {
  return <button className={cn("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", buttonVariants[variant], buttonSizes[size], className)} {...props} />;
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)} {...props} />; }
export function Badge({ className = "", tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = { neutral: "bg-muted text-muted-foreground", success: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300", warning: "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300", danger: "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300", info: "border border-primary/20 bg-primary/5 text-primary dark:text-primary-foreground" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`} {...props} />;
}
export function Spinner({ className = "" }: { className?: string }) { return <span aria-hidden="true" className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />; }
export function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />; }
export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="mb-1.5 text-xs font-bold tracking-wide text-primary">{eyebrow}</p>}<h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>; }
