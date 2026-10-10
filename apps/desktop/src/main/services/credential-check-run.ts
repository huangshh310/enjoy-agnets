/**
 * 存密钥后的一次轻量校验：优先 GET /models；没有目录再 1 token POST。
 * 6s 超时，不重试，不回传 HTTP 原文。
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
  const flag = env.ENJOY_E2E_CREDENTIAL
  if (flag === "invalid") return { state: "invalid", code: "auth_rejected" }
  if (flag === "ok") return { state: "ok" }
  if (flag === "unverified" || flag?.startsWith("unverified:")) {
    return { state: "unverified", code: unverifiedFixtureCode(flag) }
  }
  return { state: "ok" }
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
  try {
    const listed = await fetchCatalogStatus(profile, style, fetchImpl)
    if (listed !== undefined) {
      if (catalogMissingStatus(listed)) {
        return stamp(await probeOneToken(profile, style, fetchImpl), now())
      }
      return stamp(classifyCredentialStatus(listed), now())
    }
    return stamp(await probeOneToken(profile, style, fetchImpl), now())
  } catch (error) {
    return stamp(classifyCredentialFailure(failureKind(error)), now())
  }
}

function stamp(check: CredentialCheck, at: string): CredentialCheck {
  return parseCredentialCheck(withCredentialCheckedAt(check, at))
}

async function fetchCatalogStatus(
  profile: CredentialCheckProfile,
  style: ApiStyle,
  fetchImpl: typeof fetch
): Promise<number | undefined> {
  const base = catalogRequestURL(profile)
  if (!base) return undefined
  const url = base.endsWith("/models") ? base : `${base.replace(/\/+$/, "")}/models`
  const response = await fetchImpl(url, {
    method: "GET",
    headers: catalogHeaders(style, profile.apiKey),
    signal: AbortSignal.timeout(CREDENTIAL_CHECK_TIMEOUT_MS)
  })
  return response.status
}

async function probeOneToken(
  profile: CredentialCheckProfile,
  style: ApiStyle,
  fetchImpl: typeof fetch
): Promise<CredentialCheck> {
  const base = catalogRequestURL(profile) || profile.baseURL.trim()
  if (!base) return { state: "unverified", code: "unknown" }
  const url = probeUrl(base.replace(/\/+$/, ""), style)
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      ...catalogHeaders(style, profile.apiKey),
      accept: "application/json",
      "content-type": "application/json"
    },
    body: probeBody(style, profile.modelId.trim() || "detect"),
    signal: AbortSignal.timeout(CREDENTIAL_CHECK_TIMEOUT_MS)
  })
  return classifyCredentialStatus(response.status)
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

function probeUrl(base: string, style: ApiStyle): string {
  if (style === "openai-responses") return `${base}/responses`
  if (style === "anthropic") {
    return base.endsWith("/v1") ? `${base}/messages` : `${base}/v1/messages`
  }
  return `${base}/chat/completions`
}

function probeBody(style: ApiStyle, model: string): string {
  if (style === "openai-responses") {
    return JSON.stringify({
      model,
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
      max_output_tokens: 1
    })
  }
  if (style === "anthropic") {
    return JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
  }
  return JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 })
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
