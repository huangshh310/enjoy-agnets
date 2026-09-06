/**
 * Grok：邮箱来自 auth.json 公开字段；用量只认官方 billing creditUsagePercent。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { parseGrokInspect, parseGrokModels } from "../parse"
import { runSafeCli } from "../run-cli"
import { readGrokOfficialAccount } from "../session-usage"
import { officialOrEmpty } from "./shared"

export async function probeGrok(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [modelsRaw, inspectRaw, official] = await Promise.all([
    runSafeCli("grok", command, ["models"], { cwd }),
    runSafeCli("grok", command, ["inspect", "--json"], { cwd }),
    readGrokOfficialAccount()
  ])
  const parsed = modelsRaw
    ? parseGrokModels(modelsRaw)
    : { authAccount: { loggedIn: false, authMethod: "grok login", organization: "xAI" }, models: [] }
  const version = inspectRaw ? parseGrokInspect(inspectRaw) : {}
  const loggedIn = parsed.authAccount.loggedIn || Boolean(official.authAccount?.loggedIn)
  return {
    authAccount: {
      ...parsed.authAccount,
      ...version,
      ...official.authAccount,
      loggedIn,
      organization: "xAI"
    },
    quotaInfo: officialOrEmpty(loggedIn, official.quotaInfo, "SuperGrok / Premium+"),
    models: parsed.models.length > 0 ? parsed.models : [...(catalogFor("grok")?.models ?? [])]
  }
}
