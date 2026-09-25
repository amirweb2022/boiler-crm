import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

// =====================================================================
// اتصال مستقیم به REST API کاوه‌نگار (بدون پکیج واسطه‌ای npm).
// دلیل این تصمیم: پکیج رسمی "kavenegar" بین نسخه‌های مختلف رفتار
// ناسازگاری داشت (گاهی callback، گاهی چیزی برنمی‌گردوند) که باعث خطاهای
// گنگ می‌شد. REST API خودِ کاوه‌نگار مستند، پایدار، و بدون این ابهام است.
// مستندات: https://kavenegar.com/rest.html
// =====================================================================

interface KavenegarRestResponse {
  return: { status: number; message: string };
  entries?:
    | { messageid: number; status: number; statustext: string; [key: string]: unknown }
    | Array<{ messageid: number; status: number; statustext: string; [key: string]: unknown }>;
}

export class KavenegarSmsProvider implements SmsProvider {
  private apiKey: string;
  private sender?: string;

  constructor(apiKey = process.env.KAVENEGAR_API_KEY!, sender = process.env.KAVENEGAR_SENDER) {
    if (!apiKey) throw new Error("KAVENEGAR_API_KEY تنظیم نشده است");
    this.apiKey = apiKey;
    this.sender = sender;
  }

  async send({ phone, message }: SendSmsInput): Promise<SendSmsResult> {
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
    const params = new URLSearchParams({
      receptor: phone,
      message,
      ...(this.sender ? { sender: this.sender } : {}),
    });

    try {
      const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
      const json: KavenegarRestResponse = await res.json();

      console.log("📦 پاسخ کامل کاوه‌نگار:", JSON.stringify(json, null, 2));

      if (json.return?.status !== 200) {
        console.error("❌ درخواست کاوه‌نگار رد شد:", json.return);
        return { success: false, error: json.return?.message ?? `کد وضعیت: ${json.return?.status}` };
      }

      const first = Array.isArray(json.entries) ? json.entries[0] : json.entries;
      console.log(`ℹ️ وضعیت واقعی تحویل: status=${first?.status} (${first?.statustext})`);

      return { success: true, providerRef: String(first?.messageid ?? "") };
    } catch (err: any) {
      console.error("❌ خطا در برقراری ارتباط با کاوه‌نگار:", err);
      return { success: false, error: err?.message ?? "خطا در برقراری ارتباط با کاوه‌نگار" };
    }
  }
}