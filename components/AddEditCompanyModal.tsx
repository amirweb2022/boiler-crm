"use client";

import { useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { dateObjectToISO } from "../lib/date/shamsi";
import { COMPANIES_CATALOG } from "../lib/data/companies-catalog";
import type { CompanyWithDetails } from "../types";

interface Props {
  company?: CompanyWithDetails;
  onClose: () => void;
  onSaved: () => void;
}

// افزودن/ویرایش شرکت — کد و نام دیگر تایپی نیستند؛ از کاتالوگ ثابت
// برنامه انتخاب می‌شوند (دراپ‌داون). در حالت ویرایش، انتخاب شرکت غیرقابل
// تغییر است (چون یعنی رکورد شرکت دیگری می‌شود، نه ویرایش همین رکورد).
export default function AddEditCompanyModal({ company, onClose, onSaved }: Props) {
  const isEdit = Boolean(company);

  const [catalogCode, setCatalogCode] = useState(company?.catalogCode ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [province, setProvince] = useState(company?.province ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [shamsiDate, setShamsiDate] = useState<DateObject | null>(
    company?.testRecord?.testDate
      ? new DateObject({
          date: company.testRecord.testDate,
          format: "YYYY-MM-DD",
          calendar: gregorian,
          locale: gregorian_en,
        }).convert(persian, persian_fa)
      : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!catalogCode) {
      setError("انتخاب شرکت از لیست الزامی است");
      return;
    }
    if (!shamsiDate) {
      setError("انتخاب تاریخ آزمون الزامی است");
      return;
    }

    setSaving(true);
    try {
      const testDateISO = dateObjectToISO(shamsiDate);
      const payload = isEdit
        ? { phone, province, city, address, testDate: testDateISO }
        : { catalogCode, phone, province, city, address, testDate: testDateISO };

      const res = await fetch(isEdit ? `/api/companies/${company!.id}` : "/api/companies", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "خطا در ذخیره‌سازی");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{isEdit ? "ویرایش شرکت" : "افزودن شرکت جدید"}</h2>

        <Field label="شرکت">
          <select
            className="input"
            value={catalogCode}
            onChange={(e) => setCatalogCode(e.target.value)}
            disabled={isEdit}
            required
          >
            <option value="" disabled>
              انتخاب کنید...
            </option>
            {COMPANIES_CATALOG.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} — {c.code}
              </option>
            ))}
          </select>
        </Field>

        <Field label="شماره تلفن">
          <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </Field>

        <Field label="استان">
          <input className="input" value={province} onChange={(e) => setProvince(e.target.value)} required />
        </Field>

        <Field label="شهرستان">
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: شهریار" />
        </Field>

        <Field label="آدرس (اختیاری)">
          <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        <Field label="تاریخ آزمون (شمسی)">
          <DatePicker
            className="crm-date-picker"
            calendar={persian}
            locale={persian_fa}
            value={shamsiDate}
            onChange={(d) => setShamsiDate(d as DateObject | null)}
            calendarPosition="bottom-right"
            inputClass="input"
            containerClassName="w-full"
          />
        </Field>

        {error && <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 rounded-lg px-3 py-2 mb-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 font-medium"
          >
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg py-2.5 font-medium">
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm mb-1.5 text-gray-700 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}
