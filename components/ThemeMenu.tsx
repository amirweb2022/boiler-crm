"use client";

import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";
const storageKey = "boiler-crm-theme";
const labels: Record<Theme, string> = {
  light: "روشن",
  dark: "تیره",
  system: "سیستم",
};

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
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
    const sync = () => {
      const selected = readTheme();
      setTheme(selected);
      applyTheme(selected, media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function choose(value: Theme) {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Keep the choice active for this page when browser storage is unavailable.
    }
    setTheme(value);
    applyTheme(value, window.matchMedia("(prefers-color-scheme: dark)").matches);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      ref={container}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`نمایش: ${labels[theme]}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((previous) => !previous)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        نمایش: {labels[theme]} ▾
      </button>
      {open && (
        <div role="menu" aria-label="حالت نمایش" className="absolute left-0 z-[60] mt-2 min-w-32 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {(["light", "dark", "system"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option}
              onClick={() => choose(option)}
              className="block w-full rounded-md px-3 py-2 text-right text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <span aria-hidden="true" className="inline-block w-5">{theme === option ? "✓" : ""}</span>
              {labels[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
