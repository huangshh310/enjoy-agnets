/**
 * 排队项动作：立即发送 / 退回输入框。时间线虚线泡与列表共用。
 */
import { setComposerSkillChips } from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import { useChatStore } from "../../stores/chat-store"
import { queueComposerAsset } from "../composer-assets"
import { focusComposerEnd } from "../composer-focus"
import {
  editQueuedMessage,
  elevateToSteer,
  restoreFollowup,
  setRuntimeHint,
  takeFollowup,
  type FollowupItem
} from "../followup-queue"
import { isAcpComposerRuntime } from "../../lib/agent-runtime"
import { releaseQueuedDraftAssets } from "../../lib/session-draft-storage"
import type { SteerOutcome } from "./steer-composer"
import { setQuotedContexts } from "../quoted-context"
import { sendComposerMessage, steerPreparedText } from "../send-composer"

/**
 * 空闲立刻开下一轮；运行中走纠偏，不把排队塞进当前 turn 的 tool 边界。
 * leo MUST 1（#155）：任何失败都把这条原样放回队首（字 + 图 + Chip），不丢用户内容。
 * leo MUST 2：ACP（外部 CLI）运行中收不了图——带图的这条留在队列等下一轮，给可见提示。
 */
export async function sendFollowupNow(item: FollowupItem) {
  const taken = elevateToSteer(item.id)
  if (!taken) return
  const store = useChatStore.getState()
  if (!store.running) {
    releaseQueuedDraftAssets(taken.sessionId, taken.id)
    await sendComposerMessage({ content: taken.prompt, assets: taken.assets })
    return
  }
  if (taken.assets.length > 0 && isAcpComposerRuntime(store.runtimeId)) {
    requeueImageSteer(taken)
    return
  }
  let outcome: SteerOutcome
  try {
    outcome = await steerPreparedText(taken.prompt, { assets: taken.assets, fromQueue: true })
  } catch (error) {
    useChatStore.getState().setError(error instanceof Error ? error.message : String(error))
    outcome = "failed"
  }
  if (outcome === "images_unsupported") {
    requeueImageSteer(taken)
    return
  }
  if (outcome === "failed" || outcome === "requeue") {
    restoreFollowup(taken)
    return
  }
  // steered：main 已在落库事务里清了这几张；sent：发送链接手（失败还回输入框）。
  releaseQueuedDraftAssets(taken.sessionId, taken.id)
}

function requeueImageSteer(item: FollowupItem) {
  restoreFollowup(item)
  setRuntimeHint("imageSteerQueued", item.sessionId)
}

/** × 删排队项：图随这项一起丢（草稿里的排队标记行一并清）。 */
export function discardFollowup(item: FollowupItem) {
  const taken = takeFollowup(item.id)
  if (!taken) return
  releaseQueuedDraftAssets(taken.sessionId, taken.id)
}

export function returnFollowupToComposer(item: FollowupItem) {
  const taken = editQueuedMessage(item.id)
  if (!taken) return
  releaseQueuedDraftAssets(taken.sessionId, taken.id)
  useChatStore.getState().setComposer(taken.draft ?? taken.prompt)
  setQuotedContexts(taken.quotedContexts ?? [])
  setComposerSkillChips(taken.skillChips ?? [])
  for (const asset of taken.assets) queueComposerAsset(asset)
  focusComposerEnd()
}
