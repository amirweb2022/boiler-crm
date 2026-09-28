"use client";

import { useEffect, useState, useCallback } from "react";
import {
  toShamsiDisplay,
  toShamsiDateTime,
  daysUntil,
} from "../lib/date/shamsi";
import type {
  CompanyWithDetails,
  TestProximity,
  TestStatus,
  PaginatedResult,
  Vessel,
} from "../types";
import AddEditCompanyModal from "./AddEditCompanyModal";
import AddEditVesselModal from "./AddEditVesselModal";
import CertificateUploadModal from "./CertificateUploadModal";
import CertificateGenerateModal from "./CertificateGenerateModal";
const PROXIMITY_LABEL: Record<
  TestProximity,
  { text: string; className: string }
> = {
  near_due: { text: "نزدیک سررسید", className: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300" },
  due: { text: "سررسید", className: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300" },
  overdue: { text: "معوق", className: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300" },
  done: { text: "انجام‌شده", className: "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300" },
  unscheduled: {
    text: "برنامه‌ریزی‌شده",
    className: "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300",
  },
};

const PROVINCES = [
  "تهران",
  "اصفهان",
  "فارس",
  "خراسان رضوی",
  "آذربایجان شرقی",
  "گیلان",
];

export default function CompanyAccordion() {
  const [rows, setRows] = useState<CompanyWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [certificateVessel, setCertificateVessel] = useState<Vessel | null>(
    null,
  );
  const pageSize = 10;

  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("all");
  const [status, setStatus] = useState<TestStatus | "all">("all");
  const [proximity, setProximity] = useState<TestProximity | "all">("all");

  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<CompanyWithDetails | null>(null);
  const [uploadTarget, setUploadTarget] = useState<CompanyWithDetails | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [vesselModal, setVesselModal] = useState<{
    companyId: string;
    vessel?: Vessel;
  } | null>(null);
  const [busyVesselId, setBusyVesselId] = useState<string | null>(null);
  const [expandedReasonVesselId, setExpandedReasonVesselId] = useState<
    string | null
  >(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<"admin" | "tester" | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => setMyRole(json.admin?.role ?? null))
      .catch(() => setMyRole(null));
  }, []);

  const isAdmin = myRole === "admin";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        province,
        status,
        proximity,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/companies?${params.toString()}`);
      const json: PaginatedResult<CompanyWithDetails> = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, province, status, proximity, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeleteCompany(company: CompanyWithDetails) {
    if (!confirm(`حذف شرکت «${company.name}» قطعی است؟`)) return;
    await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleMarkDone(company: CompanyWithDetails) {
    if (
      !confirm(
        `چرخه تست شرکت «${company.name}» به‌عنوان انجام‌شده ثبت و برای سال بعد تنظیم شود؟`,
      )
    )
      return;
    setBusyAction(company.id);
    try {
      const res = await fetch(`/api/test-records/${company.id}/mark-done`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "خطا در ثبت انجام تست");
        return;
      }
      fetchData();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleVessel(vessel: Vessel) {
    setBusyVesselId(vessel.id);
    try {
      const res = await fetch(`/api/vessels/${vessel.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tested: !vessel.tested }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "خطا در تغییر وضعیت مخزن");
        return;
      }
      fetchData();
    } finally {
      setBusyVesselId(null);
    }
  }

  async function handleDeleteVessel(vessel: Vessel) {
    if (!confirm(`حذف مخزن «${vessel.name}»؟`)) return;
    await fetch(`/api/vessels/${vessel.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleExcludeVessel(vessel: Vessel) {
    const reason = prompt(
      `دلیل معاف‌کردن مخزن «${vessel.name}» از این چرخه را بنویسید:`,
    );
    if (reason === null) return; // انصراف
    if (reason.trim().length < 5) {
      alert("دلیل باید حداقل ۵ کاراکتر باشد");
      return;
    }
    setBusyVesselId(vessel.id);
    try {
      const res = await fetch(`/api/vessels/${vessel.id}/exclude`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded: true, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "خطا در ثبت معافیت");
        return;
      }
      fetchData();
    } finally {
      setBusyVesselId(null);
    }
  }

  async function handleIncludeVessel(vessel: Vessel) {
    if (!confirm(`معافیت مخزن «${vessel.name}» لغو شود؟ دوباره باید تست شود.`))
      return;
    setBusyVesselId(vessel.id);
    try {
      const res = await fetch(`/api/vessels/${vessel.id}/exclude`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "خطا در لغو معافیت");
        return;
      }
      fetchData();
    } finally {
      setBusyVesselId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {/* نوار جستجو و فیلترها */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          placeholder="جستجو بر اساس نام، کد یا تلفن..."
          className="flex-1 min-w-[220px] input"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="input w-auto"
          value={province}
          onChange={(e) => {
            setPage(1);
            setProvince(e.target.value);
          }}
        >
          <option value="all">همه استان‌ها</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as TestStatus | "all");
          }}
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="done">انجام‌شده</option>
        </select>
        <select
          className="input w-auto"
          value={proximity}
          onChange={(e) => {
            setPage(1);
            setProximity(e.target.value as TestProximity | "all");
          }}
        >
          <option value="all">همه سررسیدها</option>
          <option value="near_due">نزدیک سررسید</option>
          <option value="due">سررسید</option>
          <option value="overdue">معوق</option>
        </select>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mr-auto bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            + افزودن شرکت جدید
          </button>
        )}
      </div>

      {myRole === "tester" && (
        <p className="text-sm text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-4">
          شما با دسترسی «تستر» وارد شده‌اید — فقط می‌توانید وضعیت تست‌شدن مخازن
          را تیک بزنید.
        </p>
      )}

      {/* لیست آکاردئونی شرکت‌ها */}
      <div className="space-y-3">
        {loading && (
          <p className="text-center text-gray-400 dark:text-slate-400 py-8">در حال بارگذاری...</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="text-center text-gray-400 dark:text-slate-400 py-8">رکوردی یافت نشد</p>
        )}

        {!loading &&
          rows.map((c) => {
            const isOpen = expandedId === c.id;
            const dateReached = c.testRecord
              ? daysUntil(c.testRecord.testDate) <= 0
              : false;

            return (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
              >
                {/* هدر شرکت */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-400">
                      ({c.catalogCode})
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${PROXIMITY_LABEL[c.proximity].className}`}
                    >
                      {PROXIMITY_LABEL[c.proximity].text}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-300" dir="ltr">
                      {toShamsiDisplay(c.testRecord?.testDate)}
                    </span>
                  </div>
                  <span className="text-gray-400 dark:text-slate-400 text-sm">
                    {isOpen ? "بستن ▲" : "نمایش مخازن ▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-4 bg-gray-50/50 dark:bg-slate-800/60">
                    {/* اطلاعات تماس + عملیات شرکت */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-sm text-gray-600 dark:text-slate-300">
                      <div className="flex gap-4 flex-wrap">
                        <span dir="ltr">📞 {c.phone}</span>
                        <span>📍 {c.province}</span>
                        {c.address && <span>🏠 {c.address}</span>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => setEditTarget(c)}
                            className="text-xs text-gray-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-blue-400"
                          >
                            ویرایش شرکت
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(c)}
                            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            حذف شرکت
                          </button>
                        </div>
                      )}
                    </div>

                    {/* لیست مخازن */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
                      {c.vessels.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-slate-400 text-center py-4">
                          هنوز مخزنی اضافه نشده است
                        </p>
                      )}
                      {c.vessels.map((v) => {
                        const isExcluded = v.status === "excluded";
                        const isReasonOpen = expandedReasonVesselId === v.id;
                        return (
                          <div key={v.id} className="px-4 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              {isExcluded ? (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                      معاف از این چرخه
                                    </span>
                                    <span className="text-gray-500 dark:text-slate-300">
                                      {v.name}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-slate-400">
                                      {v.volume}
                                    </span>
                                    {v.exclusionReason && (
                                      <button
                                        onClick={() =>
                                          setExpandedReasonVesselId(
                                            isReasonOpen ? null : v.id,
                                          )
                                        }
                                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline"
                                      >
                                        {isReasonOpen
                                          ? "بستن دلیل ▲"
                                          : "نمایش دلیل ▾"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <label
                                  className={`flex items-center gap-3 flex-1 ${
                                    dateReached
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed opacity-60"
                                  }`}
                                  title={
                                    !dateReached
                                      ? "تاریخ آزمون هنوز فرانرسیده است"
                                      : ""
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={v.tested}
                                    disabled={
                                      !dateReached || busyVesselId === v.id
                                    }
                                    onChange={() => handleToggleVessel(v)}
                                    className="w-4 h-4 accent-brand-600"
                                  />
                                  <span
                                    className={
                                      v.tested
                                        ? "line-through text-gray-400 dark:text-slate-400"
                                        : ""
                                    }
                                  >
                                    {v.name}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-slate-400">
                                    {v.volume}
                                  </span>
                                </label>
                              )}
                              {isAdmin && (
                                <div className="flex gap-2 whitespace-nowrap">
                                  {isExcluded ? (
                                    <button
                                      disabled={busyVesselId === v.id}
                                      onClick={() => handleIncludeVessel(v)}
                                      className="text-xs text-brand-600 dark:text-blue-400 hover:text-brand-700 dark:hover:text-blue-300"
                                    >
                                      لغو معافیت
                                    </button>
                                  ) : (
                                    !v.tested && (
                                      <button
                                        disabled={busyVesselId === v.id}
                                        onClick={() => handleExcludeVessel(v)}
                                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                      >
                                        معاف کردن
                                      </button>
                                    )
                                  )}
                                  <button
                                    onClick={() =>
                                      setVesselModal({
                                        companyId: c.id,
                                        vessel: v,
                                      })
                                    }
                                    className="text-xs text-gray-500 dark:text-slate-300 hover:text-brand-600 dark:hover:text-blue-400"
                                  >
                                    ویرایش
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVessel(v)}
                                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                  >
                                    حذف
                                  </button>
                                  {!isExcluded && (
                                    <button
                                      onClick={() => setCertificateVessel(v)}
                                      className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-200 font-medium"
                                    >
                                      تولید گواهی
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            {isExcluded &&
                              isReasonOpen &&
                              v.exclusionReason && (
                                <div className="mt-2 mr-1 text-xs text-gray-600 dark:text-slate-300 bg-purple-50/60 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 rounded-lg px-3 py-2">
                                  <span className="font-medium">
                                    دلیل معافیت:{" "}
                                  </span>
                                  {v.exclusionReason}
                                  {v.excludedAt && (
                                    <span
                                      className="block text-gray-400 dark:text-slate-400 mt-1"
                                      dir="ltr"
                                    >
                                      {toShamsiDateTime(v.excludedAt)}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setVesselModal({ companyId: c.id })}
                        className="mt-2 text-sm text-brand-600 dark:text-blue-400 hover:text-brand-700 dark:hover:text-blue-300 font-medium"
                      >
                        + افزودن مخزن
                      </button>
                    )}

                    {/* عملیات نهایی شرکت — فقط admin و فقط وقتی تاریخ فرارسیده،
                        همه مخازن تست‌شده، و گواهی آپلود شده باشد فعال است */}
                    {isAdmin && (
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <button
                          disabled={!c.canMarkDone || busyAction === c.id}
                          onClick={() => handleMarkDone(c)}
                          className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-400 text-white rounded-lg px-4 py-2 font-medium"
                          title={
                            !c.canMarkDone
                              ? "ابتدا باید تاریخ فرارسیده، همه مخازن تست‌شده، و گواهی آپلود شده باشد"
                              : ""
                          }
                        >
                          ثبت انجام (شروع چرخه بعد)
                        </button>
                        <button
                          disabled={!c.allVesselsTested || !dateReached}
                          onClick={() => setUploadTarget(c)}
                          className="text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-400 text-white rounded-lg px-4 py-2 font-medium"
                          title={
                            !c.allVesselsTested
                              ? "ابتدا باید همه مخازن تست‌شده باشند"
                              : ""
                          }
                        >
                          {c.testRecord?.certificateUploaded
                            ? "بروزرسانی گواهی"
                            : "ثبت گواهی"}
                        </button>
                        {c.testRecord?.certificateUploaded &&
                          c.testRecord.certificateUrl && (
                            <a
                              href={c.testRecord.certificateUrl}
                              target="_blank"
                              className="text-sm text-brand-600 dark:text-blue-400 underline self-center"
                            >
                              دانلود گواهی فعلی
                            </a>
                          )}
                      </div>
                    )}
                    {!isAdmin &&
                      c.testRecord?.certificateUploaded &&
                      c.testRecord.certificateUrl && (
                        <a
                          href={c.testRecord.certificateUrl}
                          target="_blank"
                          className="inline-block mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-sm text-brand-600 dark:text-blue-400 underline"
                        >
                          دانلود گواهی فعلی
                        </a>
                      )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* صفحه‌بندی */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-slate-300">
        <span>
          مجموع {total} رکورد — صفحه {page} از {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40"
          >
            قبلی
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddEditCompanyModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}
      {editTarget && (
        <AddEditCompanyModal
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchData();
          }}
        />
      )}
      {vesselModal && (
        <AddEditVesselModal
          companyId={vesselModal.companyId}
          vessel={vesselModal.vessel}
          onClose={() => setVesselModal(null)}
          onSaved={() => {
            setVesselModal(null);
            fetchData();
          }}
        />
      )}
      {uploadTarget && (
        <CertificateUploadModal
          company={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onUploaded={() => {
            setUploadTarget(null);
            fetchData();
          }}
        />
      )}
      {certificateVessel && (
        <CertificateGenerateModal
          vessel={certificateVessel}
          onClose={() => setCertificateVessel(null)}
          onGenerated={() => setCertificateVessel(null)}
        />
      )}
    </div>
  );
}
