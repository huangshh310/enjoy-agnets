/**
 * 运行中纠偏：有 ActiveRun 走 agent.steer；没有则 idle 新开一轮、仍 running 改排队。
 */
import { getIde, hasIde } from "../../lib/ide"
import { useChatStore } from "../../stores/chat-store"
import { steerFallbackWhenNoRun } from "../composer-submit-intent"
import { enqueueFollowup, setRuntimeHint } from "../followup-queue"
import { clearComposerDraft } from "./composer-draft"
import { sendComposerMessage } from "./send-composer-run"

export async function steerPreparedText(content: string) {
  await steerComposer(content)
}

async function steerComposer(content: string) {
  const store = useChatStore.getState()
  if (!store.running) {
    clearComposerDraft()
    return sendComposerMessage({ content })
  }
  try {
    if (!hasIde() || !store.sessionId) throw new Error("STEER_NO_ACTIVE_RUN")
    await getIde().agent.steer({
      sessionId: store.sessionId,
      runId: store.runId ?? undefined,
      text: content
    })
    store.appendUserMessage(content)
    clearComposerDraft()
    setRuntimeHint("steered")
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    if (raw.includes("STEER_NO_ACTIVE_RUN")) {
      await fallbackSteerWithoutRun(content)
      return
    }
    store.setError(raw)
  }
}

/** 没有 ActiveRun：已 idle 立刻新开一轮，否则进 followup 等自启。 */
async function fallbackSteerWithoutRun(content: string) {
  const store = useChatStore.getState()
  if (steerFallbackWhenNoRun(store.running) === "send") {
    clearComposerDraft()
    return sendComposerMessage({ content })
  }
  enqueueFollowup({ sessionId: store.sessionId ?? "", prompt: content, assets: [] })
  clearComposerDraft()
  setRuntimeHint("queued")
}
