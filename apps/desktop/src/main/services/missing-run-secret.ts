/**
 * 缺 Key 机器错：闸已放行但解析密钥时才确定没有 Key。
 * 叶子文件，测试可直接 import，禁止把这句英文摊进 UI。
 */
import { NO_CHAT_ROUTE, type AgentRunResult } from "@enjoy-agents/ipc-contract/chat-readiness"

export const MISSING_RUN_SECRET = "Add an API key in Settings before running an agent."

export function isMissingRunSecretError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Add an API key in Settings")
}

/** 缺 Key 折成发送闸码，禁止 throw 把 IPC 包一层英文前缀。 */
export function foldMissingRunSecret(error: unknown): AgentRunResult | null {
  if (isMissingRunSecretError(error)) return { ok: false, code: NO_CHAT_ROUTE }
  return null
}
