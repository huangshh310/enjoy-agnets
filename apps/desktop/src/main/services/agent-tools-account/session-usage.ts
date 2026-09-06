/**
 * 用本机已登录会话拉官方用量。token 只在 main 内存里用一次，不进返回值、不写回文件。
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import type { AgentToolAuthAccount, AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"
import { parseJsonObject } from "./parse"
import {
  parseCursorDashboardUsage,
  parseGrokAuthPublic,
  parseGrokBillingCredits,
  pickGrokSessionKey
} from "./parse-official-usage"

const FETCH_MS = 2_500

export async function readCursorOfficialQuota(): Promise<AgentToolQuotaInfo | undefined> {
  const token = readCursorAccessToken()
  if (!token) return undefined
  const json = await postJson(
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage",
    token,
    { "Connect-Protocol-Version": "1" }
  )
  return json ? parseCursorDashboardUsage(json) : undefined
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
