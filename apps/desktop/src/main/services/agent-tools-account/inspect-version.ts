/**
 * inspect 补版本：优先官方 cliVersion，缺了再跑 --version。
 * 不进 list，避免设置页卡数秒。
 */
import { AGENT_TOOL_PRESETS, probeBinaries } from "@enjoy-agents/agent-harness"
import type { AgentToolId, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { pickInspectVersion } from "./inspect-version-pick"

export { pickInspectVersion }

export async function attachInspectVersion(
  id: AgentToolId,
  command: string | undefined,
  result: InspectAgentToolResult
): Promise<InspectAgentToolResult> {
  const preset = AGENT_TOOL_PRESETS.find((item) => item.id === id)
  const args = preset?.detectArgs.length ? [...preset.detectArgs] : ["--version"]
  const disk = command ? (await probeBinaries([command], args)).version : null
  const version = disk || pickInspectVersion(result) || result.version || null
  return {
    ...result,
    version,
    authAccount: result.authAccount
      ? { ...result.authAccount, cliVersion: result.authAccount.cliVersion ?? version ?? undefined }
      : result.authAccount
  }
}
