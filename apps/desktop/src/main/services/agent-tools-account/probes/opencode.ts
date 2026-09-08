/**
 * OpenCode：账号只认 `auth list`，模型认 `models`。不读 auth.json。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { parseOpenCodeAuth, parseProviderModelLines } from "../parse-cli-lines"
import { runSafeCli } from "../run-cli"

export async function probeOpenCode(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [authRaw, modelsRaw] = await Promise.all([
    runSafeCli("opencode", command, ["auth", "list"], { cwd }),
    runSafeCli("opencode", command, ["models"], { cwd })
  ])
  const authAccount = authRaw
    ? parseOpenCodeAuth(authRaw)
    : { loggedIn: false, authMethod: "opencode auth login", organization: "OpenCode" }
  const inspected = modelsRaw ? parseProviderModelLines(modelsRaw) : []
  return {
    authAccount,
    models: inspected.length ? inspected : [...(catalogFor("opencode")?.models ?? [])]
  }
}
