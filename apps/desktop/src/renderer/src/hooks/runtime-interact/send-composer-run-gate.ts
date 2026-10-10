/**
 * agent.run 结构化闸：挡住还草稿，成功才取 runId。
 */
import {
  agentRunBlockedCode,
  requireAgentRunId,
  type SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"
import { mergeComposerText } from "../queue-composer-send"

export type ComposerRunGate =
  | { ok: true; runId: string }
  | { ok: false; code: SendGateCode; composer: string }

/** `{ ok:false, code:"no_chat_route" }` 必须回草稿，不要当成功。 */
export function applyComposerRunGate(
  result: unknown,
  draft: string,
  currentComposer: string
): ComposerRunGate {
  const code = agentRunBlockedCode(result)
  if (code) {
    return { ok: false, code, composer: mergeComposerText(draft, currentComposer) }
  }
  return { ok: true, runId: requireAgentRunId(result) }
}
