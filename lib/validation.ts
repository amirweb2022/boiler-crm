import { z } from "zod";

// =====================================================================
// اعتبارسنجی متمرکز ورودی — هر API route قبل از هر کار باید ورودی را
// از یکی از این اسکیماها عبور بدهد. این جلوی تزریق داده‌ی نامعتبر،
// رشته‌های خیلی بلند (DoS ساده)، و فرمت‌های غیرمنتظره را می‌گیرد.
// =====================================================================

// شماره موبایل ایران: 09xxxxxxxxx (دقیقاً ۱۱ رقم، با 09 شروع می‌شود)
const iranPhoneRegex = /^09\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(iranPhoneRegex, "شماره موبایل باید به‌صورت 09xxxxxxxxx باشد");

export const uuidSchema = z.string().uuid("شناسه نامعتبر است");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ نامعتبر است");

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "رمزعبور الزامی است").max(200),
});

export const createCompanySchema = z.object({
  catalogCode: z.string().trim().min(1).max(20),
  phone: phoneSchema,
  province: z.string().trim().min(1, "استان الزامی است").max(60),
  city: z.string().trim().max(60).optional(),
  address: z.string().trim().max(500).optional(),
  testDate: isoDateSchema,
});

export const updateCompanySchema = z.object({
  phone: phoneSchema.optional(),
  province: z.string().trim().min(1).max(60).optional(),
  city: z.string().trim().max(60).optional(),
  address: z.string().trim().max(500).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  testDate: isoDateSchema.optional(),
});

export const upsertRegionMapSchema = z.object({
  province: z.string().trim().min(1, "نام استان الزامی است").max(60),
  regionName: z.string().trim().min(1, "نام منطقه الزامی است").max(60),
});

export const createVesselSchema = z.object({
  companyId: uuidSchema,
  name: z.string().trim().min(1, "نام مخزن الزامی است").max(150),
  volume: z.string().trim().min(1, "حجم مخزن الزامی است").max(50),
  type: z.enum(["tank", "boiler"]),
});

export const updateVesselSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  volume: z.string().trim().min(1).max(50).optional(),
  type: z.enum(["tank", "boiler"]).optional(),
});

export const toggleVesselSchema = z.object({
  tested: z.boolean(),
});

export const excludeVesselSchema = z.object({
  excluded: z.boolean(),
  // وقتی excluded=true، دلیل الزامی است (برای audit trail و شفافیت)؛
  // وقتی excluded=false (لغو معافیت)، دلیل لازم نیست.
  reason: z.string().trim().max(500).optional(),
}).refine((data) => !data.excluded || (data.reason && data.reason.length >= 5), {
  message: "برای معاف کردن مخزن، ذکر دلیل (حداقل ۵ کاراکتر) الزامی است",
  path: ["reason"],
});

/** ابزار کمکی: اعتبارسنجی + پیام خطای یکدست فارسی برای همه API routeها */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message ?? "داده ورودی نامعتبر است";
    throw new ValidationError(firstError);
  }
  return result.data;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
