"use client";

import { useState } from "react";
import type { Vessel } from "../types";

interface Props {
  companyId: string;
  vessel?: Vessel;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEditVesselModal({
  companyId,
  vessel,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(vessel);
  const [name, setName] = useState(vessel?.name ?? "");
  const [volume, setVolume] = useState(vessel?.volume ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"tank" | "boiler">(vessel?.type ?? "tank");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/vessels/${vessel!.id}` : "/api/vessels",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? { name, volume, type } : { companyId, name, volume, type },
          ),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "خطا در ذخیره‌سازی مخزن");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "ویرایش مخزن" : "افزودن مخزن"}
        </h2>
        <div className="mb-4">
          <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">
            نوع تجهیز
          </label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as "tank" | "boiler")}
          >
            <option value="tank">مخزن</option>
            <option value="boiler">دیگ بخار</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">نام مخزن</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">حجم مخزن</label>
          <input
            className="input"
            placeholder="مثال: 500 لیتر"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 font-medium"
          >
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5 font-medium"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}
