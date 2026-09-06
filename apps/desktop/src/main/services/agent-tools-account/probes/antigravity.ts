/**
 * Antigravity：邮箱来自 accounts.json；额度只认 quota_groups.remaining_fraction。
 */
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { quotaFromAntigravity, quotasFromAntigravityGroups } from "../antigravity-quota"
import { asString, parseAgyModels, parseJsonObject } from "../parse"
import { runSafeCli } from "../run-cli"

export async function probeAntigravity(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [modelsRaw, account] = await Promise.all([
    runSafeCli("antigravity", command, ["models"], { cwd }),
    readAntigravityPublic()
  ])
  const models = modelsRaw ? parseAgyModels(modelsRaw) : []
  return {
    authAccount: account.authAccount,
    quotaInfo: account.quotaInfo,
    models: models.length > 0 ? models : [...(catalogFor("antigravity")?.models ?? [])]
  }
}

/** 只取邮箱与 quota_groups；没有分组就不编造进度。 */
async function readAntigravityPublic(): Promise<Omit<InspectAgentToolResult, "id" | "models">> {
  const unsigned = { authAccount: { loggedIn: false, authMethod: "agy login", organization: "Google" } }
  const accountsFile = join(homedir(), ".antigravity_tools", "accounts.json")
  if (!existsSync(accountsFile)) return unsigned
  try {
    const parsed = parseJsonObject(await readFile(accountsFile, "utf-8"))
    const accounts = Array.isArray(parsed?.accounts) ? parsed.accounts : []
    const currentId = typeof parsed?.current_account_id === "string" ? parsed.current_account_id : ""
    const picked = asIdEmail(accounts.find((item) => asIdEmail(item)?.id === currentId) ?? accounts[0])
    if (!picked) return unsigned
    const detailPath = join(homedir(), ".antigravity_tools", "accounts", `${picked.id}.json`)
    const detail = existsSync(detailPath) ? parseJsonObject(await readFile(detailPath, "utf-8")) : null
    const quota = asRecord(detail?.quota)
    const groups = quotasFromAntigravityGroups(quota?.quota_groups)
    return {
      authAccount: {
        loggedIn: true,
        email: picked.email,
        accountName: picked.name || picked.email.split("@")[0],
        tier: asString(quota?.subscription_tier),
        authMethod: "agy login",
        organization: "Google"
      },
      quotaInfo: quotaFromAntigravity(groups, asString(quota?.subscription_tier), picked.email)
    }
  } catch {
    return unsigned
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function asIdEmail(value: unknown): { id: string; email: string; name?: string } | undefined {
  if (!value || typeof value !== "object") return undefined
  const rec = value as Record<string, unknown>
  const id = typeof rec.id === "string" ? rec.id : ""
  const email = typeof rec.email === "string" ? rec.email : ""
  if (!id || !email) return undefined
  return { id, email, name: typeof rec.name === "string" ? rec.name : undefined }
}
