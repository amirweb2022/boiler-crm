// =====================================================================
// Core domain types — یک‌به‌یک منطبق با schema.sql (v2)
// =====================================================================

export type CompanyStatus = "active" | "inactive";
export type TestStatus = "pending" | "done";
export type NotificationType = "reminder" | "certificate_ready" | "overdue";
export type NotificationStatus = "pending" | "sent" | "failed";
// admin: دسترسی کامل (ساخت/ویرایش/حذف شرکت و مخزن، ثبت گواهی، ثبت انجام)
// tester: فقط اجازه تیک‌زدن/برداشتن تیک وضعیت مخازن را دارد
export type AdminRole = "admin" | "tester";
export type VesselType = "tank" | "boiler";
export interface Admin {
  id: string;
  phone: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Company {
  id: string;
  catalogCode: string;
  name: string;
  phone: string;
  province: string;
  address: string | null;
  city: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  type: VesselType;
}

export interface TestRecord {
  id: string;
  companyId: string;
  testDate: string; // ISO date "YYYY-MM-DD" میلادی — نمایش شمسی در UI
  status: TestStatus;
  certificateUploaded: boolean;
  certificateUrl: string | null;
  certificatePath: string | null;
  proofOfUploadPending: boolean;
  doneAt: string | null;
  cycleCount: number;
  createdAt: string;
  updatedAt: string;
}

export type VesselStatus = "active" | "excluded";

export interface Vessel {
  id: string;
  companyId: string;
  name: string;
  volume: string;
  tested: boolean;
  status: VesselStatus;
  exclusionReason: string | null;
  excludedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: VesselType;
}

export type TestProximity =
  | "near_due"
  | "due"
  | "overdue"
  | "done"
  | "unscheduled";

// رکورد ترکیبی که در داشبورد (آکاردئون) نمایش داده می‌شود
export interface CompanyWithDetails extends Company {
  testRecord: TestRecord | null;
  vessels: Vessel[];
  proximity: TestProximity;
  allVesselsTested: boolean;
  canMarkDone: boolean; // تاریخ فرارسیده + همه مخازن تست‌شده
}

export interface Notification {
  id: string;
  companyId: string | null;
  testRecordId: string | null;
  phone: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  providerRef: string | null;
  sentAt: string | null;
  createdAt: string;
}

// ---- API contracts ----

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyListFilters {
  search?: string;
  province?: string;
  status?: TestStatus | "all";
  proximity?: TestProximity | "all";
  page?: number;
  pageSize?: number;
}

// توجه: code/name دیگر از کلاینت گرفته نمی‌شود — فقط catalogCode، که
// سرور آن را در برابر COMPANIES_CATALOG معتبرسنجی و نام واقعی را استخراج می‌کند.
export interface CreateCompanyInput {
  catalogCode: string;
  phone: string;
  province: string;
  city?: string;
  address?: string;
  testDate: string; // ISO
}

export interface UpdateCompanyInput {
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  status?: CompanyStatus;
  testDate?: string;
}

export interface CreateVesselInput {
  companyId: string;
  name: string;
  volume: string;
  type: VesselType;
}

export interface UpdateVesselInput {
  name?: string;
  volume?: string;
  type: VesselType;
}

// ---- گزارش ماهانه ----

export interface TestHistoryEntry {
  id: string;
  companyId: string | null;
  companyName: string;
  companyCatalogCode: string | null;
  companyProvince: string;
  companyCity: string | null;
  companyPhone: string;
  companyAddress: string | null;
  vesselId: string | null;
  vesselName: string;
  vesselVolume: string;
  testDate: string; // ISO
  result: "approved";
  cycleCount: number | null;
  createdAt: string;
}

export interface ProvinceRegionMapEntry {
  id: string;
  province: string;
  regionName: string;
  createdAt: string;
  updatedAt: string;
}
