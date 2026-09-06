/**
 * login / doctor / vault 共用：自定义路径必须是该 CLI 白名单 basename。
 */
import { agentToolPreset, assertAllowedCommand } from "@enjoy-agents/agent-harness"

export function assertSafeAgentCommand(id: string, command: string) {
  const preset = agentToolPreset(id)
  if (!preset) throw new Error(`Unknown agent tool '${id}'.`)
  assertAllowedCommand(preset, command)
}

/** 读路径时忽略历史脏数据，避免 doctor / list 去 spawn bash。 */
export function safeCustomBinaryPath(id: string, path: string | undefined): string | undefined {
  const trimmed = path?.trim()
  if (!trimmed) return undefined
  try {
    assertSafeAgentCommand(id, trimmed)
    return trimmed
  } catch {
    return undefined
  }
}
