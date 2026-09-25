"use client";

import { useEffect, useState, useCallback } from "react";
import { toShamsiDateTime } from "../lib/date/shamsi";
import type { AuditLogEntry, PaginatedAuditLogs } from "../lib/db/audit.repository";

const ENTITY_TYPE_LABEL: Record<string, string> = {
  company: "شرکت",
  vessel: "مخزن",
  test_record: "رکورد تست",
  admin: "ادمین",
  report: "گزارش",
  region_map: "نگاشت منطقه",
};

const ACTION_LABEL: Record<string, string> = {
  "company.create": "ایجاد شرکت",
  "company.update": "ویرایش شرکت",
  "company.delete": "حذف شرکت",
  "vessel.create": "افزودن مخزن",
  "vessel.update": "ویرایش مخزن",
  "vessel.delete": "حذف مخزن",
  "vessel.toggle": "تغییر وضعیت تست مخزن",
  "vessel.exclude": "معاف‌کردن مخزن از چرخه",
  "vessel.include": "لغو معافیت مخزن",
  "report.download_monthly": "دانلود گزارش ماهانه",
  "region_map.upsert": "ثبت/ویرایش نگاشت منطقه",
  "region_map.delete": "حذف نگاشت منطقه",
  "test_record.mark_done": "ثبت انجام آزمون",
  "test_record.upload_certificate": "آپلود گواهی",
  "admin.login": "ورود به سیستم",
};

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}
function entityLabel(entityType: string): string {
  return ENTITY_TYPE_LABEL[entityType] ?? entityType;
}

export default function AuditLogList() {
  const [myRole, setMyRole] = useState<"admin" | "tester" | null | "loading">("loading");
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => setMyRole(json.admin?.role ?? null))
      .catch(() => setMyRole(null));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        entityType,
        action,
        search,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        setRows([]);
        setTotal(0);
        return;
      }
      const json: PaginatedAuditLogs = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [entityType, action, search, page, pageSize]);

  useEffect(() => {
    if (myRole === "admin") fetchData();
  }, [myRole, fetchData]);

  if (myRole === "loading") {
    return <p className="text-center text-gray-400 py-8">در حال بررسی دسترسی...</p>;
  }
  if (myRole !== "admin") {
    return (
      <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
        شما دسترسی به بخش تاریخچه تغییرات را ندارید — این بخش فقط برای نقش «admin» است.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          placeholder="جستجو بر اساس شماره ادمین..."
          className="flex-1 min-w-[200px] input"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="input w-auto"
          value={entityType}
          onChange={(e) => {
            setPage(1);
            setEntityType(e.target.value);
          }}
        >
          <option value="all">همه نوع رکوردها</option>
          <option value="company">شرکت</option>
          <option value="vessel">مخزن</option>
          <option value="test_record">رکورد تست</option>
          <option value="report">گزارش</option>
          <option value="region_map">نگاشت منطقه</option>
          <option value="admin">ادمین</option>
        </select>
        <select
          className="input w-auto"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          <option value="all">همه عملیات‌ها</option>
          {Object.entries(ACTION_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={pageSize}
          onChange={(e) => {
            setPage(1);
            setPageSize(Number(e.target.value));
          }}
        >
          <option value={10}>۱۰ در صفحه</option>
          <option value={20}>۲۰ در صفحه</option>
          <option value={50}>۵۰ در صفحه</option>
        </select>
      </div>

      {/* لیست تاریخچه */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading && <p className="text-center text-gray-400 py-8">در حال بارگذاری...</p>}
        {!loading && rows.length === 0 && <p className="text-center text-gray-400 py-8">رکوردی یافت نشد</p>}

        {!loading &&
          rows.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span className="text-gray-400 whitespace-nowrap" dir="ltr">
                      {toShamsiDateTime(log.createdAt)}
                    </span>
                    <span className="font-medium">{log.adminFullName || log.adminPhone || "نامشخص"}</span>
                    <span className="text-gray-500">{actionLabel(log.action)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {entityLabel(log.entityType)}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{isExpanded ? "بستن ▲" : "جزئیات ▼"}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 text-xs text-gray-500 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span>شماره ادمین: {log.adminPhone ?? "—"}</span>
                      <span dir="ltr">IP: {log.ipAddress ?? "—"}</span>
                      <span className="col-span-2 break-all">شناسه رکورد: {log.entityId ?? "—"}</span>
                    </div>
                    {log.metadata && (
                      <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto text-left" dir="ltr">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* صفحه‌بندی */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>
          مجموع {total} رکورد — صفحه {page} از {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40"
          >
            قبلی
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
}
