import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

// =====================================================================
// اتصال مستقیم به REST API کاوه‌نگار (بدون پکیج واسطه‌ای npm).
// دلیل این تصمیم: پکیج رسمی "kavenegar" بین نسخه‌های مختلف رفتار
// ناسازگاری داشت (گاهی callback، گاهی چیزی برنمی‌گردوند) که باعث خطاهای
// گنگ می‌شد. REST API خودِ کاوه‌نگار مستند، پایدار، و بدون این ابهام است.
// مستندات: https://kavenegar.com/rest.html
// =====================================================================

interface KavenegarRestResponse {
  return?: { status?: number; message?: string };
  entries?: Array<{ messageid?: number; status?: number; statustext?: string }>;
}

export class KavenegarSmsProvider implements SmsProvider {
  async send({ phone, message }: SendSmsInput): Promise<SendSmsResult> {
    if (!process.env.KAVENEGAR_API_KEY) {
      return { success: false, error: "KAVENEGAR_API_KEY تنظیم نشده است" };
    }
    const params = new URLSearchParams({ receptor: phone, message });
    if (process.env.KAVENEGAR_SENDER) params.set("sender", process.env.KAVENEGAR_SENDER);
    const url = `https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API_KEY}/sms/send.json?${params}`;
    try {
      const res = await fetch(`${url}`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      const json: KavenegarRestResponse | null = await res.json();

      if (!res.ok || json?.return?.status !== 200) {
        console.error("Kavenegar SMS request rejected", {
          httpStatus: res.status,
          apiStatus: json?.return?.status,
        });
        return {
          success: false,
          error: json?.return?.message ?? `خطای کاوه‌نگار (${res.status})`,
        };
      }

      const entries = json.entries;
      if (
        !Array.isArray(entries) ||
        entries.length === 0 ||
        entries.some(
          (entry) =>
            !entry ||
            !Number.isSafeInteger(entry.messageid) ||
            !entry.messageid ||
            typeof entry.status !== "number",
        )
      ) {
        console.error("Kavenegar SMS response missing valid entry", {
          httpStatus: res.status,
        });
        return { success: false, error: "پاسخ نامعتبر از کاوه‌نگار" };
      }

      const failedEntry = entries.find((entry) => entry.status !== 1);
      if (failedEntry) {
        console.error("Kavenegar SMS entry not queued", {
          entryStatus: failedEntry.status,
        });
        return {
          success: false,
          error: failedEntry.statustext || "Kavenegar SMS entry not queued",
        };
      }

      return { success: true, providerRef: String(entries[0].messageid) };
    } catch (err: unknown) {
      console.error("Kavenegar SMS request failed", {
        reason: err instanceof Error ? err.name : "UnknownError",
      });
      return { success: false, error: "خطا در برقراری ارتباط با کاوه‌نگار" };
    }
  }
}
