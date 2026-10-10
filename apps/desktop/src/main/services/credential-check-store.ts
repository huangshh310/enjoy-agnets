/**
 * 档案密钥校验落盘：settings KV，不进 vault 明文旁路。renderer 只读列表上的字段。
 */
import {
  parseCredentialCheck,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { getSetting, setSetting } from "./database"

const CHECKS_KEY = "provider.credentialChecks"

type CheckMap = Record<string, CredentialCheck>

export function readCredentialChecks(): CheckMap {
  const raw = getSetting(CHECKS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: CheckMap = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!id.trim()) continue
      out[id] = parseCredentialCheck(value)
    }
    return out
  } catch {
    return {}
  }
}

export function readCredentialCheck(id: string): CredentialCheck | undefined {
  return readCredentialChecks()[id]
}

export function writeCredentialCheck(id: string, check: CredentialCheck): CredentialCheck {
  const parsed = parseCredentialCheck(check)
  const next = { ...readCredentialChecks(), [id]: parsed }
  setSetting(CHECKS_KEY, JSON.stringify(next))
  return parsed
}

export function clearCredentialCheck(id: string): void {
  const current = readCredentialChecks()
  if (!(id in current)) return
  delete current[id]
  setSetting(CHECKS_KEY, JSON.stringify(current))
}
