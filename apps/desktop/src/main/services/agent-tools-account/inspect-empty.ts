/**
 * 无公开账号探针的 inspect 回执：未登录且 probed=false，禁止永远停在检测中，也不得闸发送。
 */
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"

const ACCOUNT_PROBE_IDS = [
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "opencode",
  "pi",
  "omp",
  "deepseek"
] as const

export function hasOfficialAccountProbe(id: string): boolean {
  if (id.startsWith("custom:")) return false
  return (ACCOUNT_PROBE_IDS as readonly string[]).includes(id)
}

export function emptyInspectResult(
  id: AgentToolId,
  models: InspectAgentToolResult["models"] = []
): InspectAgentToolResult {
  return {
    id,
    models,
    authAccount: { loggedIn: false, probed: false }
  }
}
