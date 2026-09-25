import type { SmsProvider } from "./types";
import { KavenegarSmsProvider } from "./kavenegar";
import { MockSmsProvider } from "./mock";

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? "mock";
  switch (provider) {
    case "kavenegar":
      return new KavenegarSmsProvider();
    case "mock":
    default:
      return new MockSmsProvider();
  }
}

export * from "./types";
