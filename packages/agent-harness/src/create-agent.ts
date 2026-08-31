/**
 * 按适配器目录创建 HarnessAgent。Claude / Codex / OpenCode 要网络沙箱；Pi 走本机 just-bash。
 */
import { createClaudeCodeAgent } from "./adapters/claude-code.ts"
import { createCodexAgent } from "./adapters/codex.ts"
import { createOpenCodeAgent } from "./adapters/opencode.ts"
import { createPiAgent } from "./adapters/pi.ts"
import { assertHarnessReady } from "./ready.ts"
import type { CreateHarnessCodingAgentInput } from "./types.ts"

export type { CreateHarnessCodingAgentInput, HarnessCredentials } from "./types"

/** 创建可 stream / createSession 的编码 Harness。 */
export function createHarnessCodingAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = assertHarnessReady(input)
  if (adapter.id === "claude-code") return createClaudeCodeAgent(input)
  if (adapter.id === "codex") return createCodexAgent(input)
  if (adapter.id === "pi") return createPiAgent(input)
  if (adapter.id === "opencode") return createOpenCodeAgent(input)
  throw new Error(`Harness adapter '${adapter.id}' is not wired yet.`)
}
