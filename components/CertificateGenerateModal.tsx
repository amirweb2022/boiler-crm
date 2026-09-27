"use client";

import { useEffect, useState } from "react";
import type { Vessel } from "../types";

interface CertField {
  key: string;
  label: string;
  required: boolean;
  group?: string;
}

interface Props {
  vessel: Vessel;
  onClose: () => void;
  onGenerated: () => void;
}

// فرم پویا: بر اساس نوع تجهیز (مخزن/دیگ بخار)، فیلدهای مربوطه از سرور
// خوانده و رندر می‌شود. فقط فیلدهای غیرخودکار اینجا نمایش داده می‌شوند —
// نام/نشانی شرکت، حجم مخزن، و تاریخ آزمون خودکار از سیستم پر می‌شوند.
export default function CertificateGenerateModal({ vessel, onClose, onGenerated }: Props) {
  const [fields, setFields] = useState<CertField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/certificates/fields?type=${vessel.type}`)
      .then((res) => res.json())
      .then((json) => setFields(json.fields ?? []))
      .finally(() => setLoading(false));
  }, [vessel.type]);

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleConfirm() {
    setError(null);

    const missing = fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length > 0) {
      setError(`این فیلدها الزامی‌اند: ${missing.map((f) => f.label).join("، ")}`);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vesselId: vessel.id, values }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "خطا در ساخت گواهی");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `گواهی-${vessel.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onGenerated();
    } finally {
      setGenerating(false);
    }
  }

  const thicknessFields = fields.filter((f) => f.group === "thickness");
  const otherFields = fields.filter((f) => f.group !== "thickness");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">تولید گواهی — {vessel.name}</h2>
        <p className="text-sm text-gray-500 mb-4">
          نام/نشانی شرکت، حجم مخزن، و تاریخ آزمون خودکار از سیستم درج می‌شوند. فقط فیلدهای زیر را کامل کن.
        </p>

        {loading && <p className="text-center text-gray-400 py-6">در حال بارگذاری فرم...</p>}

        {!loading && thicknessFields.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-2">ضخامت‌های اندازه‌گیری‌شده (الزامی)</p>
            <div className="grid grid-cols-2 gap-3">
              {thicknessFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                  <input
                    className="input"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div className="space-y-3 mb-4">
            {otherFields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm mb-1 text-gray-700">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  className="input"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValue(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-2 mt-2">
          <button
            disabled={loading || generating}
            onClick={handleConfirm}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 font-medium"
          >
            {generating ? "در حال ساخت PDF..." : "تایید و دانلود گواهی"}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 font-medium">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}