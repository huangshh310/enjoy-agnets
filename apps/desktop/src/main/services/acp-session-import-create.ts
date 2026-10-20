/**
 * 导入一条本机助手的 ACP 会话：建 Enjoy 会话、绑定 ACP sessionId、记导入来源。
 * 不碰 agent-harness / 引擎设置（单测可直接加载）；记引擎在 importAcpSession 里。
 */
import type { ImportAcpSessionInput } from "@enjoy-agents/ipc-contract"
import { writeAcpSessionBind, writeSessionImportedFrom } from "./acp-session-bind.ts"
import { createSession } from "./session-queries"

export async function createImportedAcpSession(input: ImportAcpSessionInput) {
  const title = input.title?.trim() || "从本机助手导入"
  const created = await createSession(input.workspaceId, title.slice(0, 80))
  writeAcpSessionBind(created.id, input.runtimeId, input.acpSessionId)
  // luna g157b：导入的会话没有消息，靠来源标记不被当空壳删（切引擎清绑定也不清它）。
  writeSessionImportedFrom(created.id, input.runtimeId)
  return created
}
