/**
 * 用本机已登录会话拉官方用量。token 只在 main 内存里用一次，不进返回值、不写回文件。
 * 对标 OpenUsage：覆盖 Cursor、Grok、Claude Code 与 Codex 官方实时配额与信用点。
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import type { AgentToolAuthAccount, AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"
import { parseJsonObject } from "./parse"
import { parseCursorExtraUsage, parseCursorGrokBotUsage } from "./parse-cursor-extras"
import {
  parseClaudeUsageResponse,
  parseCodexUsageResponse,
  parseCursorDashboardUsage,
  parseGrokAuthPublic,
  parseGrokBillingCredits,
  pickGrokSessionKey
} from "./parse-official-usage"

const FETCH_MS = 3_500

export async function readCursorOfficialQuota(): Promise<AgentToolQuotaInfo | undefined> {
  const token = readCursorAccessToken()
  if (!token) return undefined
  const cookie = cursorSessionCookie(token)
  const [usage, grokBot, summary] = await Promise.all([
    postJson(
      "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
      token,
      { "Connect-Protocol-Version": "1" }
    ),
    postJson(
      "https://api2.cursor.sh/aiserver.v1.DashboardService/GetSandUsageStatus",
      token,
      { "Connect-Protocol-Version": "1" }
    ),
    cookie
      ? requestJson("https://cursor.com/api/usage-summary", {
          method: "GET",
          headers: {
            accept: "application/json",
            cookie: `WorkosCursorSessionToken=${cookie}`
          }
        })
      : Promise.resolve(null)
  ])
  const quota = parseCursorDashboardUsage(usage) ?? {
    hasQuota: true,
    usedPercent: 0,
    windowType: "Cursor",
    windows: []
  }
  const grokWindow = grokBot ? parseCursorGrokBotUsage(grokBot) : undefined
  const extra = parseCursorExtraUsage(summary)
  quota.windows = [...(quota.windows ?? []), ...(grokWindow ? [grokWindow] : []), extra]
  return quota
}

export async function readGrokOfficialAccount(): Promise<{
  authAccount?: Pick<AgentToolAuthAccount, "email" | "accountName" | "loggedIn">
  quotaInfo?: AgentToolQuotaInfo
}> {
  const auth = readGrokAuthJson()
  if (!auth) return {}
  const authAccount = parseGrokAuthPublic(auth)
  const token = pickGrokSessionKey(auth)
  if (!token) return { authAccount }
  const json = await getJson("https://cli-chat-proxy.grok.com/v1/billing?format=credits", token, {
    "x-grok-client-surface": "grok-build"
  })
  return { authAccount, quotaInfo: json ? parseGrokBillingCredits(json) : undefined }
}

export async function readClaudeOfficialQuota(): Promise<AgentToolQuotaInfo | undefined> {
  const token = readClaudeAccessToken()
  if (!token) return undefined
  const json = await getJson("https://api.anthropic.com/api/oauth/usage", token, {
    "anthropic-beta": "oauth-2025-04-20",
    "user-agent": "claude-code/2.1.69",
    accept: "application/json"
  })
  return json ? parseClaudeUsageResponse(json) : undefined
}

export async function readCodexOfficialQuota(): Promise<AgentToolQuotaInfo | undefined> {
  const auth = readCodexAuth()
  if (!auth?.accessToken) return undefined
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "OpenUsage/Codex"
  }
  if (auth.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId
  }

  const [usageJson, creditsJson] = await Promise.all([
    getJson("https://chatgpt.com/backend-api/wham/usage", auth.accessToken, headers),
    getJson("https://chatgpt.com/backend-api/wham/rate-limit-reset-credits", auth.accessToken, headers)
  ])

  return usageJson ? parseCodexUsageResponse(usageJson, creditsJson) : undefined
}

export async function consumeCodexResetCredit(creditId?: string): Promise<{ ok: boolean; message?: string }> {
  const auth = readCodexAuth()
  if (!auth?.accessToken) return { ok: false, message: "Codex auth token not found" }
  try {
    const res = await fetch("https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(creditId ? { credit_id: creditId } : {}),
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) {
      return { ok: false, message: `Consume failed with HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}

function cursorSessionCookie(accessToken: string): string | undefined {
  const parts = accessToken.split(".")
  if (parts.length < 2) return undefined
  try {
    const payload = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8")) as {
      sub?: unknown
    }
    const subject = typeof payload.sub === "string" ? payload.sub : ""
    const userId = subject.includes("|") ? subject.slice(subject.indexOf("|") + 1) : subject
    if (!userId) return undefined
    return `${userId}%3A%3A${accessToken}`
  } catch {
    return undefined
  }
}

function readCursorAccessToken(): string | undefined {
  const dbPath = cursorStateDb()
  if (!existsSync(dbPath)) return undefined
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true })
    try {
      const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get("cursorAuth/accessToken") as
        | { value?: unknown }
        | undefined
      return typeof row?.value === "string" && row.value.length > 20 ? row.value : undefined
    } finally {
      db.close()
    }
  } catch {
    return undefined
  }
}

function cursorStateDb(): string {
  if (process.platform === "darwin") {
    return join(homedir(), "Library/Application Support/Cursor/User/globalStorage/state.vscdb")
  }
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? homedir(), "Cursor/User/globalStorage/state.vscdb")
  }
  return join(homedir(), ".config/Cursor/User/globalStorage/state.vscdb")
}

function readClaudeAccessToken(): string | undefined {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim()) {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN.trim()
  }
  const credPath = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), ".credentials.json")
  if (existsSync(credPath)) {
    try {
      const parsed = parseJsonObject(readFileSync(credPath, "utf-8"))
      const oauth = parsed?.claudeAiOauth as Record<string, unknown> | undefined
      const token = typeof oauth?.accessToken === "string" ? oauth.accessToken.trim() : undefined
      if (token) return token
    } catch {
      // ignore
    }
  }
  return undefined
}

function readCodexAuth(): { accessToken: string; accountId?: string } | undefined {
  const codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex")
  const authPath = join(codexHome, "auth.json")
  if (!existsSync(authPath)) return undefined
  try {
    const parsed = parseJsonObject(readFileSync(authPath, "utf-8"))
    const tokens = parsed?.tokens as Record<string, unknown> | undefined
    const accessToken = typeof tokens?.access_token === "string" ? tokens.access_token.trim() : undefined
    const accountId = typeof tokens?.account_id === "string" ? tokens.account_id.trim() : undefined
    if (accessToken) {
      return { accessToken, accountId }
    }
  } catch {
    // ignore
  }
  return undefined
}

function readGrokAuthJson(): Record<string, unknown> | null {
  const path = join(homedir(), ".grok", "auth.json")
  if (!existsSync(path)) return null
  try {
    return parseJsonObject(readFileSync(path, "utf-8"))
  } catch {
    return null
  }
}

async function postJson(
  url: string,
  token: string,
  headers: Record<string, string>
): Promise<Record<string, unknown> | null> {
  return requestJson(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
    body: "{}"
  })
}

async function getJson(
  url: string,
  token: string,
  headers: Record<string, string>
): Promise<Record<string, unknown> | null> {
  return requestJson(url, { method: "GET", headers: { authorization: `Bearer ${token}`, ...headers } })
}

async function requestJson(
  url: string,
  init: RequestInit
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_MS) })
    if (!res.ok) return null
    const parsed: unknown = await res.json()
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
