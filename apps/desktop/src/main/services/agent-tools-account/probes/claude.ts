/**
 * Claude：账号只认 `auth status`。官方 CLI 不打印用量，已登录画空条。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { parseClaudeAuth } from "../parse"
import { runSafeCli } from "../run-cli"
import { officialOrEmpty } from "./shared"

export async function probeClaude(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const raw = await runSafeCli("claude", command, ["auth", "status"], { cwd })
  const authAccount =
    (raw ? parseClaudeAuth(raw) : undefined) ?? {
      loggedIn: false,
      authMethod: "claude auth login",
      organization: "Anthropic"
    }
  return {
    authAccount,
    quotaInfo: officialOrEmpty(authAccount.loggedIn, undefined, authAccount.tier ?? "Claude"),
    models: [...(catalogFor("claude")?.models ?? [])]
  }
}
