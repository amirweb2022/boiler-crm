"use client";

import { useState } from "react";
import type { CompanyWithDetails } from "../types";

interface Props {
  company: CompanyWithDetails;
  onClose: () => void;
  onUploaded: () => void;
}

export default function CertificateUploadModal({ company, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"select" | "confirm" | "uploading" | "done">("select");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!file) return;
    setStep("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/test-records/${company.id}/upload-certificate`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "خطا در آپلود گواهی");
        setStep("confirm");
        return;
      }
      setStep("done");
      setTimeout(onUploaded, 1200);
    } catch {
      setError("خطا در ارتباط با سرور");
      setStep("confirm");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1">آپلود گواهی آزمون</h2>
        <p className="text-sm text-gray-500 dark:text-slate-300 mb-4">شرکت: {company.name}</p>

        {step === "select" && (
          <>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                disabled={!file}
                onClick={() => setStep("confirm")}
                className="flex-1 bg-brand-600 disabled:opacity-50 text-white rounded-lg py-2.5 font-medium"
              >
                ادامه
              </button>
              <button onClick={onClose} className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5">
                انصراف
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-sm rounded-lg px-3 py-3 mb-4">
              با تایید، فایل «{file?.name}» به‌عنوان گواهی نهایی ثبت شده و پیامک حاوی لینک دانلود
              به‌صورت خودکار برای شرکت «{company.name}» ارسال می‌شود.
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 font-medium"
              >
                تایید و ارسال
              </button>
              <button onClick={() => setStep("select")} className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5">
                بازگشت
              </button>
            </div>
          </>
        )}

        {step === "uploading" && <p className="text-center text-gray-500 dark:text-slate-300 py-6">در حال آپلود و ارسال پیامک...</p>}
        {step === "done" && (
          <p className="text-center text-green-600 dark:text-green-400 font-medium py-6">✓ گواهی با موفقیت آپلود و پیامک ارسال شد</p>
        )}
      </div>
    </div>
  );
}
