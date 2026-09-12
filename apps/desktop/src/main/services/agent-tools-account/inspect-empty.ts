/**
 * 无公开账号探针的 inspect 回执：未登录，禁止永远停在检测中。
 */
import { catalogFor } from "@enjoy-agents/agent-harness"
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"

export function emptyInspectResult(id: AgentToolId): InspectAgentToolResult {
  return {
    id,
    models: [...(catalogFor(id)?.models ?? [])],
    authAccount: { loggedIn: false }
  }
}
