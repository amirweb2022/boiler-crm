"use client";

import { useState } from "react";
import type { Vessel } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl sm:p-7"
      >
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "ویرایش دستگاه" : "افزودن دستگاه"}
        </h2>
        <div className="mb-4">
          <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">
            نوع تجهیز
          </label>
          <Select
            value={type}
            onValueChange={(value) => handleTypeChange(value as typeof type)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tank">مخزن</SelectItem>
              <SelectItem value="boiler">دیگ بخار</SelectItem>
              <SelectItem value="lift">بالابر</SelectItem>
              <SelectItem value="forklift">لیفتراک</SelectItem>
              <SelectItem value="grounding">ارت</SelectItem>
            </SelectContent>
          </Select>
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
