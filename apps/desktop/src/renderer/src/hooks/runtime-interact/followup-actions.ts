/**
 * 排队项动作：立即发送 / 退回输入框。时间线虚线泡与列表共用。
 */
import { setComposerSkillChips } from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import { useChatStore } from "../../stores/chat-store"
import { queueComposerAsset } from "../composer-assets"
import { focusComposerEnd } from "../composer-focus"
import { editQueuedMessage, elevateToSteer, type FollowupItem } from "../followup-queue"
import { setQuotedContexts } from "../quoted-context"
import { sendComposerMessage, steerPreparedText } from "../send-composer"

/** 空闲立刻开下一轮；运行中走纠偏，不把排队塞进当前 turn 的 tool 边界。 */
export async function sendFollowupNow(item: FollowupItem) {
  const taken = elevateToSteer(item.id)
  if (!taken) return
  if (useChatStore.getState().running) {
    await steerPreparedText(taken.prompt)
    return
  }
  await sendComposerMessage({ content: taken.prompt, assets: taken.assets })
}

export function returnFollowupToComposer(item: FollowupItem) {
  const taken = editQueuedMessage(item.id)
  if (!taken) return
  useChatStore.getState().setComposer(taken.draft ?? taken.prompt)
  setQuotedContexts(taken.quotedContexts ?? [])
  setComposerSkillChips(taken.skillChips ?? [])
  for (const asset of taken.assets) queueComposerAsset(asset)
  focusComposerEnd()
}
