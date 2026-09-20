/**
 * 应答 session/request_permission。
 */
import { pickAcpPermissionOption } from "./permissions.ts"
import { asPermissionOption, asRecord } from "./acp-rpc-util.ts"
import type { AcpPermissionRequest } from "./permissions.ts"

export async function answerAcpPermission(
  write: (message: Record<string, unknown>) => void,
  onPermission: ((req: AcpPermissionRequest) => Promise<"allow" | "deny" | "allow_session">) | undefined,
  id: number,
  method: string,
  params: unknown
): Promise<void> {
  if (method !== "session/request_permission") {
    write({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method ${method}` } })
    return
  }
  const rec = asRecord(params)
  const tool = asRecord(rec.toolCall)
  const options = Array.isArray(rec.options) ? rec.options.map(asPermissionOption) : []
  const questions = rec.questions ?? tool.questions
  const asking = Array.isArray(questions) && questions.length > 0
  const decision =
    (await onPermission?.({
      sessionId: String(rec.sessionId ?? ""),
      toolCallId: String(tool.toolCallId ?? tool.id ?? "tool"),
      name: asking ? "ask_user_questions" : String(tool.title ?? tool.kind ?? tool.name ?? "tool"),
      args: asking ? { questions } : tool.rawInput ?? tool.input ?? rec.toolCall,
      options
    })) ?? "deny"
  write({ jsonrpc: "2.0", id, result: { outcome: pickAcpPermissionOption(decision, options) } })
}
