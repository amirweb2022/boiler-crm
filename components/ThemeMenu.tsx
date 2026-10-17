"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";
const storageKey = "boiler-crm-theme";
const labels: Record<Theme, string> = { light: "روشن", dark: "تیره", system: "سیستم" };
const icons = { light: Sun, dark: Moon, system: Monitor };

function readTheme(): Theme {
  try { const value = localStorage.getItem(storageKey); return value === "light" || value === "dark" ? value : "system"; }
  catch { return "system"; }
}
function applyTheme(theme: Theme, systemIsDark: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && systemIsDark));
}

export default function ThemeMenu() {
  const [theme, setTheme] = useState<Theme>("system");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { const selected = readTheme(); setTheme(selected); applyTheme(selected, media.matches); };
    sync(); media.addEventListener("change", sync); window.addEventListener("storage", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  function choose(value: Theme) {
    try { localStorage.setItem(storageKey, value); } catch { /* Keep the choice active for this page. */ }
    setTheme(value); applyTheme(value, window.matchMedia("(prefers-color-scheme: dark)").matches); setOpen(false); trigger.current?.focus();
  }
  const CurrentIcon = icons[theme];
  return <div ref={container} className="relative shrink-0" onKeyDown={(event) => { if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-label={`نمایش: ${labels[theme]}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((previous) => !previous)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm">
      <CurrentIcon className="size-4 text-muted-foreground" /><span className="hidden sm:inline">{labels[theme]}</span><ChevronDown className="size-3.5 text-muted-foreground" />
    </button>
    {open && <div role="menu" aria-label="حالت نمایش" className="absolute left-0 z-[60] mt-2 min-w-36 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
      {(["light", "dark", "system"] as const).map((option) => { const Icon = icons[option]; return <button key={option} type="button" role="menuitemradio" aria-checked={theme === option} onClick={() => choose(option)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-4 text-muted-foreground" />{labels[option]}{theme === option && <Check className="mr-auto size-4 text-primary" />}</button>; })}
    </div>}
  </div>;
}
