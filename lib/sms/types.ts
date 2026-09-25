export interface SendSmsInput {
  phone: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}
