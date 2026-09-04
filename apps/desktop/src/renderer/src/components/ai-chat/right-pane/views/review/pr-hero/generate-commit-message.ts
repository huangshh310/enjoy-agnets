/**
 * 用当前模型根据 patch 生成 Conventional Commit 说明。
 * 走 ai.generate kind=completion，renderer 不碰密钥。
 */

import { completePrompt } from "@renderer/hooks/use-completion"
import { waitForRunOutput } from "@renderer/hooks/wait-run-events"
import { useChatStore } from "@renderer/stores/chat-store"
import { sanitizeCommitMessage } from "./sanitize-commit-message"

const MAX_PATCH_CHARS = 12_000

export { sanitizeCommitMessage }

export async function generateCommitMessage(patch: string): Promise<string> {
  const trimmed = patch.trim()
  if (!trimmed) throw new Error("empty diff")
  const store = useChatStore.getState()
  if (!store.sessionId || !store.modelId) throw new Error("no model")
  const result = (await completePrompt({
    sessionId: store.sessionId,
    modelId: store.modelId,
    prompt: [
      "Write a Conventional Commit message for this git diff.",
      "Use feat/fix/refactor/chore/docs prefixes.",
      "Subject ≤ 72 characters. Optional body after a blank line.",
      "Match the language of identifiers and comments in the diff.",
      "Reply with the commit message only. No markdown fences, no quotes.",
      "",
      trimmed.slice(0, MAX_PATCH_CHARS)
    ].join("\n")
  })) as { runId: string }
  const output = await waitForRunOutput(result.runId)
  const message = sanitizeCommitMessage(output.text)
  if (!message) throw new Error("empty commit message")
  return message
}
