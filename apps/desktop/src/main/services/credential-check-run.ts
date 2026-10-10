/**
 * 存密钥后的一次轻量校验：只 GET /models。404/405 直接 unverified，不发 1 token。
 * 6s 超时，不重试，不回传 HTTP 原文。redirect:manual，避免 x-api-key 跟到别的主机。
 */
import {
  catalogMissingStatus,
  classifyCredentialFailure,
  classifyCredentialStatus,
  parseCredentialCheck,
  withCredentialCheckedAt,
  type CredentialCheck
} from "@enjoy-agents/ipc-contract/credential-check"
import { catalogRequestURL, isApiStyle, presetFor, type ApiStyle } from "@enjoy-agents/providers"
import { app } from "electron"
import { sameOriginUrl } from "./credential-fingerprint.ts"
import type { ProviderProfile } from "./secrets-vault.ts"

export const CREDENTIAL_CHECK_TIMEOUT_MS = 6_000

export type CredentialCheckProfile = Pick<
  ProviderProfile,
  "id" | "kind" | "apiKey" | "baseURL" | "apiStyle" | "modelId" | "modelsURL" | "endpoints" | "baseAPI"
>

export function e2eCredentialFixture(
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): CredentialCheck | undefined {
  if (env.ENJOY_E2E_STUB !== "1" || packaged) return undefined
  if (!env.ENJOY_E2E_USERDATA && !env.ENJOY_DEV_USERDATA) return undefined
  const flag = env.ENJOY_E2E_CREDENTIAL
  if (flag === "invalid") return { state: "invalid", code: "auth_rejected" }
  if (flag === "ok") return { state: "ok" }
  if (flag === "unverified" || flag?.startsWith("unverified:")) {
    return { state: "unverified", code: unverifiedFixtureCode(flag) }
  }
  return undefined
}

function unverifiedFixtureCode(flag: string): "network" | "timeout" | "unknown" {
  if (flag === "unverified:network") return "network"
  if (flag === "unverified:timeout") return "timeout"
  return "unknown"
}

export async function runCredentialCheck(
  profile: CredentialCheckProfile,
  now = () => new Date().toISOString(),
  fetchImpl: typeof fetch = fetch
): Promise<CredentialCheck> {
  if (fetchImpl === fetch) {
    const fixture = e2eCredentialFixture(process.env, readPackaged())
    if (fixture) return stamp(fixture, now())
  }
  const preset = presetFor(profile.kind)
  if (!preset.requiresKey) return stamp({ state: "ok" }, now())
  if (!profile.apiKey.trim()) return stamp({ state: "unverified", code: "unknown" }, now())

  const style = isApiStyle(profile.apiStyle) ? profile.apiStyle : preset.apiStyle
  const url = catalogUrlForCheck(profile)
  if (!url) return stamp({ state: "unverified", code: "unknown" }, now())
  try {
    const status = await fetchCatalogStatus(url, style, profile.apiKey, fetchImpl)
    if (status >= 300 && status < 400) {
      return stamp({ state: "unverified", code: "unknown" }, now())
    }
    if (catalogMissingStatus(status)) {
      return stamp({ state: "unverified", code: "unknown" }, now())
    }
    return stamp(classifyCredentialStatus(status), now())
  } catch (error) {
    return stamp(classifyCredentialFailure(failureKind(error)), now())
  }
}

function stamp(check: CredentialCheck, at: string): CredentialCheck {
  return parseCredentialCheck(withCredentialCheckedAt(check, at))
}

export function catalogUrlForCheck(profile: CredentialCheckProfile): string | undefined {
  const models = profile.modelsURL?.trim()
  const base = profile.baseURL?.trim()
  if (models && base && !sameOriginUrl(base, models)) {
    return catalogUrlOrUndefined({ ...profile, modelsURL: undefined })
  }
  return catalogUrlOrUndefined(profile)
}

function catalogUrlOrUndefined(profile: CredentialCheckProfile): string | undefined {
  const base = catalogRequestURL(profile).trim()
  return base || undefined
}

async function fetchCatalogStatus(
  base: string,
  style: ApiStyle,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<number> {
  const url = base.endsWith("/models") ? base : `${base.replace(/\/+$/, "")}/models`
  const response = await fetchImpl(url, {
    method: "GET",
    headers: catalogHeaders(style, apiKey),
    redirect: "manual",
    signal: AbortSignal.timeout(CREDENTIAL_CHECK_TIMEOUT_MS)
  })
  try {
    return response.status
  } finally {
    void response.body?.cancel?.()
  }
}

function catalogHeaders(style: ApiStyle, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (style === "anthropic") {
    headers["x-api-key"] = apiKey
    headers["anthropic-version"] = "2023-06-01"
    return headers
  }
  headers.Authorization = `Bearer ${apiKey}`
  return headers
}

function failureKind(error: unknown): "timeout" | "network" | "unknown" {
  const name = error instanceof Error ? error.name : ""
  const message = error instanceof Error ? error.message : ""
  if (name === "TimeoutError" || name === "AbortError" || /timeout|aborted/i.test(message)) {
    return "timeout"
  }
  if (name === "TypeError" || /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|fetch failed/i.test(message)) {
    return "network"
  }
  return "unknown"
}

function readPackaged(): boolean {
  try {
    return app.isPackaged
  } catch {
    return false
  }
}
