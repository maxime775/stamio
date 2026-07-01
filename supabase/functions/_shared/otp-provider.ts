import { isOtp, normalizeFrenchMobilePhone } from "./validation.ts";

export type OtpProvider = "twilio" | "local_test";
type AppEnvironment = "production" | "staging" | "local";

type TwilioOtpConfig = {
  appEnv: AppEnvironment;
  provider: "twilio";
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
};

type LocalTestOtpConfig = {
  appEnv: "staging" | "local";
  provider: "local_test";
  allowedPhones: ReadonlySet<string>;
  testCode: string;
};

export type OtpConfig = TwilioOtpConfig | LocalTestOtpConfig;

export function allowsTurnstileBypass(config: OtpConfig): boolean {
  return config.provider === "local_test" && (config.appEnv === "local" || config.appEnv === "staging");
}

export function getOtpConfig(): OtpConfig {
  const appEnv = (Deno.env.get("APP_ENV")?.trim() || "production") as AppEnvironment;
  const provider = (Deno.env.get("OTP_PROVIDER")?.trim() || "twilio") as OtpProvider;

  if (!(["production", "staging", "local"] as string[]).includes(appEnv)) {
    throw new Error("Invalid APP_ENV");
  }
  if (!(["twilio", "local_test"] as string[]).includes(provider)) {
    throw new Error("Invalid OTP provider");
  }
  if (appEnv === "production" && provider !== "twilio") {
    throw new Error("Invalid OTP provider in production");
  }

  if (provider === "twilio") {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new Error("Missing Twilio configuration");
    }
    return { appEnv, provider, accountSid, authToken, verifyServiceSid };
  }

  // local_test must never be enabled against production data.
  if (appEnv !== "local" && appEnv !== "staging") {
    throw new Error("local_test is restricted to local or staging environments");
  }

  const testCode = Deno.env.get("OTP_TEST_CODE")?.trim();
  const rawAllowlist = Deno.env.get("OTP_TEST_PHONE_ALLOWLIST")?.trim();
  if (!testCode || !isOtp(testCode) || !rawAllowlist) {
    throw new Error("Invalid local_test OTP configuration");
  }

  const allowedPhones = new Set<string>();
  for (const entry of rawAllowlist.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean)) {
    const normalized = normalizeFrenchMobilePhone(entry);
    if (!normalized.ok) throw new Error("Invalid phone in OTP_TEST_PHONE_ALLOWLIST");
    allowedPhones.add(normalized.phone);
  }
  if (allowedPhones.size === 0) throw new Error("OTP_TEST_PHONE_ALLOWLIST is empty");

  return { appEnv, provider, allowedPhones, testCode };
}

export async function startOtpVerification(
  config: OtpConfig,
  phone: string
): Promise<"started" | "not_allowed" | "error"> {
  if (config.provider === "local_test") {
    return config.allowedPhones.has(phone) ? "started" : "not_allowed";
  }

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/Verifications`,
    {
      method: "POST",
      headers: twilioHeaders(config),
      body: new URLSearchParams({ To: phone, Channel: "sms" })
    }
  ).catch(() => null);
  return response?.ok ? "started" : "error";
}

export async function checkOtpCode(
  config: OtpConfig,
  phone: string,
  code: string
): Promise<"approved" | "rejected"> {
  if (config.provider === "local_test") {
    return config.allowedPhones.has(phone) && constantTimeEquals(code, config.testCode) ? "approved" : "rejected";
  }

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: twilioHeaders(config),
      body: new URLSearchParams({ To: phone, Code: code })
    }
  ).catch(() => null);
  if (!response?.ok) return "rejected";
  const payload = await response.json().catch(() => null);
  return payload?.status === "approved" ? "approved" : "rejected";
}

function twilioHeaders(config: TwilioOtpConfig) {
  return {
    Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
    "Content-Type": "application/x-www-form-urlencoded"
  };
}

function constantTimeEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
