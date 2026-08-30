import { safeStorage } from "electron";
import { getSetting, setSetting } from "./database";
import type { ProviderId } from "@enjoy-agents/providers";

const SECRET_KEY = "provider.secret";

export type StoredSecret = {
  provider: ProviderId;
  apiKey: string;
  baseURL?: string;
};

export async function saveSecret(secret: StoredSecret): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS keychain encryption is not available on this machine.");
  }
  const payload = JSON.stringify(secret);
  const encrypted = safeStorage.encryptString(payload);
  setSetting(SECRET_KEY, encrypted.toString("base64"));
}

export async function readSecret(): Promise<StoredSecret | undefined> {
  const stored = getSetting(SECRET_KEY);
  if (!stored || !safeStorage.isEncryptionAvailable()) return undefined;
  try {
    const json = safeStorage.decryptString(Buffer.from(stored, "base64"));
    return JSON.parse(json) as StoredSecret;
  } catch {
    return undefined;
  }
}

export async function hasSecret(): Promise<boolean> {
  return Boolean(await readSecret());
}
