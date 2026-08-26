import { sha256Hex } from "./crypto.ts";

const PERMIT_BYTES = 32;
const OPAQUE_PERMIT_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createOpaqueBallotPermit() {
  const bytes = crypto.getRandomValues(new Uint8Array(PERMIT_BYTES));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function isOpaqueBallotPermit(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_PERMIT_PATTERN.test(value);
}

export function digestBallotPermit(permit: string) {
  return sha256Hex(permit);
}
