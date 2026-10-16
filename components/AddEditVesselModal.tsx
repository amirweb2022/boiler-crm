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
  const initialDetails = (vessel?.details ?? {}) as Record<string, string | number>;
  const [detailOne, setDetailOne] = useState(String(initialDetails.liftType ?? initialDetails.forkliftType ?? initialDetails.groundingSystemType ?? ""));
  const [detailTwo, setDetailTwo] = useState(String(initialDetails.capacityAndModel ?? initialDetails.capacity ?? initialDetails.wellCount ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"tank" | "boiler" | "lift" | "forklift" | "grounding">(vessel?.type ?? "tank");

  const legacyType = type === "tank" || type === "boiler";
  const detailLabels = type === "lift"
    ? ["نوع آسانسور/بالابر", "ظرفیت و مدل"]
    : type === "forklift"
      ? ["نوع جرثقیل/لیفتراک", "ظرفیت"]
      : ["نوع سیستم ارتینگ", "تعداد چاه"];

  function handleTypeChange(nextType: typeof type) {
    if (nextType !== type) {
      setDetailOne("");
      setDetailTwo("");
    }
    setType(nextType);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const details = type === "lift"
        ? { liftType: detailOne, capacityAndModel: detailTwo }
        : type === "forklift"
          ? { forkliftType: detailOne, capacity: detailTwo }
          : type === "grounding"
            ? { groundingSystemType: detailOne, wellCount: Number(detailTwo) }
            : undefined;
      const payload = { type, ...(legacyType ? { name, volume } : { details }) };
      const res = await fetch(
        isEdit ? `/api/vessels/${vessel!.id}` : "/api/vessels",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEdit ? payload : { companyId, ...payload }),
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
          {isEdit ? "ویرایش دستگاه" : "افزودن دستگاه"}
        </h2>
        <div className="mb-4">
          <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">
            نوع تجهیز
          </label>
          <select className="select-modern input"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as typeof type)}
          >
            <option value="tank">مخزن</option>
            <option value="boiler">دیگ بخار</option>
            <option value="lift">بالابر</option>
            <option value="forklift">لیفتراک</option>
            <option value="grounding">ارت</option>
          </select>
        </div>
        {legacyType ? <>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">{type === "tank" ? "نام مخزن" : "نام دیگ بخار"}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">{type === "tank" ? "حجم مخزن" : "ظرفیت دیگ بخار"}</label>
            <input className="input" placeholder="مثال: 500 لیتر" value={volume} onChange={(e) => setVolume(e.target.value)} required />
          </div>
        </> : <>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">{detailLabels[0]}</label>
            <input className="input" value={detailOne} onChange={(e) => setDetailOne(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">{detailLabels[1]}{type === "grounding" ? " (حلقه)" : ""}</label>
            <input className="input" type={type === "grounding" ? "number" : "text"} min={type === "grounding" ? 1 : undefined} step={type === "grounding" ? 1 : undefined} value={detailTwo} onChange={(e) => setDetailTwo(e.target.value)} required />
          </div>
        </>}

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
