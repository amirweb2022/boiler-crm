"use client";

import { useEffect, useState, useCallback } from "react";
import { toShamsiDateTime } from "../lib/date/shamsi";
import type { AuditLogEntry, PaginatedAuditLogs } from "../lib/db/audit.repository";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    return <p className="text-center text-gray-400 dark:text-slate-400 py-8">در حال بررسی دسترسی...</p>;
  }
  if (myRole !== "admin") {
    return (
      <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 rounded-lg px-4 py-3">
        شما دسترسی به بخش تاریخچه تغییرات را ندارید — این بخش فقط برای نقش «admin» است.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {/* فیلترها */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border bg-muted/35 p-3">
        <input
          placeholder="جستجو بر اساس شماره ادمین..."
          className="flex-1 min-w-[200px] input"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          value={entityType}
          onValueChange={(value) => {
            setPage(1);
            setEntityType(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نوع رکوردها</SelectItem>
            <SelectItem value="company">شرکت</SelectItem>
            <SelectItem value="vessel">مخزن</SelectItem>
            <SelectItem value="test_record">رکورد تست</SelectItem>
            <SelectItem value="report">گزارش</SelectItem>
            <SelectItem value="region_map">نگاشت منطقه</SelectItem>
            <SelectItem value="admin">ادمین</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={action}
          onValueChange={(value) => {
            setPage(1);
            setAction(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
          <SelectItem value="all">همه عملیات‌ها</SelectItem>
          {Object.entries(ACTION_LABEL).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
          </SelectContent>
        </Select>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPage(1);
            setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="w-full sm:w-auto"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">۱۰ در صفحه</SelectItem>
            <SelectItem value="20">۲۰ در صفحه</SelectItem>
            <SelectItem value="50">۵۰ در صفحه</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* لیست تاریخچه */}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-sm">
        {loading && <p className="text-center text-gray-400 dark:text-slate-400 py-8">در حال بارگذاری...</p>}
        {!loading && rows.length === 0 && <p className="text-center text-gray-400 dark:text-slate-400 py-8">رکوردی یافت نشد</p>}

        {!loading &&
          rows.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right transition-colors hover:bg-muted/60 sm:px-5"
                >
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span className="text-gray-400 dark:text-slate-400 whitespace-nowrap" dir="ltr">
                      {toShamsiDateTime(log.createdAt)}
                    </span>
                    <span className="font-medium">{log.adminFullName || log.adminPhone || "نامشخص"}</span>
                    <span className="text-gray-500 dark:text-slate-300">{actionLabel(log.action)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                      {entityLabel(log.entityType)}
                    </span>
                  </div>
                  <span className="text-gray-400 dark:text-slate-400 text-xs">{isExpanded ? "بستن ▲" : "جزئیات ▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/30 px-4 pb-4 pt-3 text-xs text-muted-foreground sm:px-5">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <span>شماره ادمین: {log.adminPhone ?? "—"}</span>
                      <span dir="ltr">IP: {log.ipAddress ?? "—"}</span>
                      <span className="col-span-2 break-all">شناسه رکورد: {log.entityId ?? "—"}</span>
                    </div>
                    {log.metadata && (
                      <pre className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto text-left" dir="ltr">
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
    </div>
  );
}
