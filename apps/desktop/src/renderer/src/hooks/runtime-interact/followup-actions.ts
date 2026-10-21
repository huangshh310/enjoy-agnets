/**
 * 排队项动作：立即发送 / 退回输入框。时间线虚线泡与列表共用。
 */
import { useChatStore } from "../../stores/chat-store"
import {
  canWriteBackToComposer,
  writeBackToComposer,
  type ComposerWritebackMode
} from "../composer-writeback"
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
  setRuntimeHint("imageSteerQueued", item.sessionId, item.assets?.length ?? 0)
}

/** × 删排队项：图随这项一起丢（草稿里的排队标记行一并清）。 */
export function discardFollowup(item: FollowupItem) {
  const taken = takeFollowup(item.id)
  if (!taken) return
  releaseQueuedDraftAssets(taken.sessionId, taken.id)
}

/**
 * 排队项放回输入框。leo BLOCK #163 ④：不直接 setComposer（回写锁期间 store 落后 DOM，会冲掉刚打的字），
 * 一律走 writeBackToComposer——
 * - "merge"（排队行上的「退回输入框」）：和输入框已有的合并；
 * - "refuse"（暂停条「改一下再发」）：输入框有东西就不动，这条留在队里，返回 false。
 * 先问能不能写，再从队里取：拒绝时排队项原封不动。
 */
export function returnFollowupToComposer(item: FollowupItem, mode: ComposerWritebackMode = "merge"): boolean {
  // 排队行只在它所属会话的线程里出现：前台换了会话就不写（expectSessionId）。
  if (!canWriteBackToComposer(mode, { expectSessionId: item.sessionId })) return false
  const taken = editQueuedMessage(item.id)
  if (!taken) return false
  releaseQueuedDraftAssets(taken.sessionId, taken.id)
  const result = writeBackToComposer(
    {
      text: taken.draft ?? taken.prompt,
      assets: taken.assets,
      quotedContexts: taken.quotedContexts,
      skillChips: taken.skillChips
    },
    { mode, expectSessionId: taken.sessionId }
  )
  return result.ok
}
