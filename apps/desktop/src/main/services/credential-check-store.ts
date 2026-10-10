/**
 * 档案密钥校验落盘：settings KV，不进 vault 明文旁路。renderer 只读列表上的字段。
 * 世代指纹不回 renderer；读时对不上当前档案当 unverified。
 */
import {
  parseCredentialCheck,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { getSetting, setSetting } from "./database"

const CHECKS_KEY = "provider.credentialChecks"

type StoredCheck = CredentialCheck & { fingerprint?: string }
type CheckMap = Record<string, StoredCheck>

export function readCredentialChecks(): CheckMap {
  const raw = getSetting(CHECKS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: CheckMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!id.trim()) continue
      out[id] = parseStoredCheck(value)
    }
    return out
  } catch {
    return {}
  }
}

export function readCredentialCheck(
  id: string,
  expectedFingerprint?: string
): CredentialCheck | undefined {
  const stored = readCredentialChecks()[id]
  if (!stored) return undefined
  return publicCredentialCheck(stored, expectedFingerprint)
}

export function writeCredentialCheck(
  id: string,
  check: CredentialCheck,
  fingerprint?: string
): CredentialCheck {
  const parsed = parseCredentialCheck(check)
  const stored: StoredCheck = fingerprint ? { ...parsed, fingerprint } : parsed
  const next = { ...readCredentialChecks(), [id]: stored }
  setSetting(CHECKS_KEY, JSON.stringify(next))
  return parsed
}

/** 只有当前档案指纹对得上才写；旧世代 401 不得盖新密钥的 ok。 */
export function writeCredentialCheckIfCurrent(
  id: string,
  check: CredentialCheck,
  fingerprint: string,
  currentFingerprint: string
): CredentialCheck | undefined {
  if (fingerprint !== currentFingerprint) return undefined
  return writeCredentialCheck(id, check, fingerprint)
}

export function clearCredentialCheck(id: string): void {
  const current = readCredentialChecks()
  if (!(id in current)) return
  delete current[id]
  setSetting(CHECKS_KEY, JSON.stringify(current))
}

export function publicCredentialCheck(
  stored: StoredCheck,
  expectedFingerprint?: string
): CredentialCheck {
  if (
    expectedFingerprint &&
    stored.fingerprint &&
    stored.fingerprint !== expectedFingerprint
  ) {
    return { state: "unverified" }
  }
  const { fingerprint: _fp, ...check } = stored
  return parseCredentialCheck(check)
}

function parseStoredCheck(raw: unknown): StoredCheck {
  if (!raw || typeof raw !== "object") return parseCredentialCheck(raw)
  const rec = raw as Record<string, unknown>
  const fingerprint = typeof rec.fingerprint === "string" && rec.fingerprint ? rec.fingerprint : undefined
  const { fingerprint: _drop, ...rest } = rec
  return fingerprint ? { ...parseCredentialCheck(rest), fingerprint } : parseCredentialCheck(rest)
}
