const values = new Map();
globalThis.Deno = {
  env: {
    get(name) {
      return values.get(name);
    }
  }
};

const {
  allowsTurnstileBypass,
  checkOtpCode,
  getOtpConfig,
  startOtpVerification
} = await import("../supabase/functions/_shared/otp-provider.ts");

setEnvironment({
  APP_ENV: "production",
  OTP_PROVIDER: "local_test",
  OTP_TEST_PHONE_ALLOWLIST: "+33612345678",
  OTP_TEST_CODE: "654321"
});
assertThrows(getOtpConfig, "production must reject local_test");

setEnvironment({
  APP_ENV: "production",
  OTP_PROVIDER: "twilio",
  TWILIO_ACCOUNT_SID: "test-account",
  TWILIO_AUTH_TOKEN: "test-token",
  TWILIO_VERIFY_SERVICE_SID: "test-service"
});
const defaultConfig = getOtpConfig();
assert(defaultConfig.appEnv === "production", "APP_ENV must default to production");
assert(defaultConfig.provider === "twilio", "OTP_PROVIDER must default to twilio");
assert(!allowsTurnstileBypass(defaultConfig), "production must never bypass Turnstile");
assert(turnstileRequired(defaultConfig), "production + twilio must require Turnstile");

setEnvironment({
  APP_ENV: "staging",
  OTP_PROVIDER: "local_test",
  OTP_TEST_PHONE_ALLOWLIST: "0612345678",
  OTP_TEST_CODE: "123456"
});
const stagingConfig = getOtpConfig();
assert(stagingConfig.provider === "local_test", "staging must allow an explicitly configured local_test provider");
assert(stagingConfig.allowedPhones.has("+33612345678"), "the local_test allowlist must be normalized");
assert(allowsTurnstileBypass(stagingConfig), "staging local_test must allow the explicit Turnstile bypass");
assert(!turnstileRequired(stagingConfig), "staging + local_test must allow the Turnstile bypass");

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("local_test must not call an external OTP provider");
};
assert(await startOtpVerification(stagingConfig, "+33612345678") === "started", "allowlisted phone must start verification");
assert(await startOtpVerification(stagingConfig, "+33712345678") === "not_allowed", "non-allowlisted phone must be refused");
assert(await checkOtpCode(stagingConfig, "+33612345678", "123456") === "approved", "configured test code must be approved");
assert(await checkOtpCode(stagingConfig, "+33612345678", "654321") === "rejected", "another code must be rejected");
assert(fetchCalls === 0, "local_test must never call Twilio");

console.log("OTP provider configuration checks passed.");

function setEnvironment(entries) {
  values.clear();
  for (const [key, value] of Object.entries(entries)) values.set(key, value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(callback, message) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(message);
}

function turnstileRequired(config) {
  return !allowsTurnstileBypass(config);
}
