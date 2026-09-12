/**
 * 从 inspect 结果抽出版本，不 spawn。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"

export function pickInspectVersion(result: InspectAgentToolResult): string | null {
  const known = result.authAccount?.cliVersion?.trim() || result.version?.trim()
  return known || null
}
