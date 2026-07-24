export async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(message: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const PHONE_ENCRYPTION_VERSION = 1;
const PHONE_ENCRYPTION_AAD = new TextEncoder().encode("stamio:account-phone:v1");

export type EncryptedPhone = {
  ciphertext: string;
  iv: string;
  version: 1;
};

export async function encryptPhoneE164(phoneE164: string): Promise<EncryptedPhone> {
  const key = await loadPhoneEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: PHONE_ENCRYPTION_AAD, tagLength: 128 },
    key,
    new TextEncoder().encode(phoneE164)
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    version: PHONE_ENCRYPTION_VERSION
  };
}

export async function decryptPhoneE164(ciphertext: string, iv: string, version: number): Promise<string> {
  if (version !== PHONE_ENCRYPTION_VERSION) throw new Error("ACCOUNT_PHONE_UNAVAILABLE");
  const encryptedBytes = base64ToBytes(ciphertext);
  const ivBytes = base64ToBytes(iv);
  if (ivBytes.byteLength !== 12 || encryptedBytes.byteLength < 17) {
    throw new Error("ACCOUNT_PHONE_UNAVAILABLE");
  }

  try {
    const key = await loadPhoneEncryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, additionalData: PHONE_ENCRYPTION_AAD, tagLength: 128 },
      key,
      encryptedBytes
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("ACCOUNT_PHONE_UNAVAILABLE");
  }
}

async function loadPhoneEncryptionKey() {
  const encodedKey = Deno.env.get("PHONE_ENCRYPTION_KEY")?.trim();
  if (!encodedKey) throw new Error("ACCOUNT_PHONE_UNAVAILABLE");

  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(encodedKey);
  } catch {
    throw new Error("ACCOUNT_PHONE_UNAVAILABLE");
  }
  if (keyBytes.byteLength !== 32) throw new Error("ACCOUNT_PHONE_UNAVAILABLE");

  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("ACCOUNT_PHONE_UNAVAILABLE");
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
