import type { SmsProvider, SendSmsInput, SendSmsResult } from "./types";

export class MockSmsProvider implements SmsProvider {
  async send({ phone, message }: SendSmsInput): Promise<SendSmsResult> {
    console.log(`📱 [MOCK SMS] → ${phone}: ${message}`);
    return { success: true, providerRef: `mock-${Date.now()}` };
  }
}
