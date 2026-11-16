/**
 * 输入框上方活动帽檐：改动 / 待验收单独一框，任务 / 目标 / 追问另一框。子项全空则不画。
 * 待验收框与 Composer 同宽、左右对齐；窄矮窗口里它可被压扁，展开区在框内滚动，不盖消息。
 * 有审批卡时不画改动条，避免「N 个文件已改」盖住 Dock 底栏按钮。
 * 有审批卡时也不画「N 条等待」芯片（B1，luna §16）：排队行已挂在审批卡正上方（QueuedFollowups dock），芯片是重复信息，
 * 733×480 下它多占的一行会把审批三钮挤出对话列。条件渲染（不是 hidden / 透明），审批走掉后芯片照常回来；队列数据不动。
 * 只在「审批在场且芯片本来要画」（同 ComposerQueueChip 的判据：有会话且该会话有排队项）时连包裹一起不渲染：
 * 这样帽檐框里没别的东西时整框按 empty:hidden 收掉，把那一行还给审批卡（733×480 三钮整颗留在对话列内）；
 * 没排队的审批态 DOM 与改前完全一样（包裹仍在、芯片自己 return null），1440 等宽窗零像素变化。只读排队列表，不写。
 */
import { useSyncExternalStore } from "react"
import { listFollowups, subscribeFollowups } from "@renderer/hooks/followup-queue"
import { useChatStore } from "@renderer/stores/chat-store"
import { STACKED_FRAME_CLASS_NAME } from "./composer-stacked-styles"
import { ComposerLiveChanges } from "./composer-live-changes"
import { ComposerTaskStack } from "./composer-task-stack"
import { ComposerContextRail } from "./composer-context-rail"
import { ComposerFollowupRail } from "../runtime-interact/composer-followup-rail"
import { ComposerQueueChip } from "../runtime-interact/composer-queue-chip"
import { ComposerPreviousPreparingRail } from "../runtime-interact/composer-previous-preparing-rail"

export function ComposerActivityFrame() {
  const pendingApproval = useChatStore((state) => state.pendingApproval)
  const sessionId = useChatStore((state) => state.sessionId)
  const queueChipShown = useSyncExternalStore(
    subscribeFollowups,
    () => Boolean(sessionId) && listFollowups(sessionId).length > 0
  )
  return (
    <>
      {pendingApproval ? null : (
        <div
          data-testid="composer-review-frame"
          className={`${STACKED_FRAME_CLASS_NAME} isolate min-h-8 shrink`}
        >
          <ComposerLiveChanges />
        </div>
      )}
      <div className={`${STACKED_FRAME_CLASS_NAME} isolate shrink-0`}>
        <ComposerTaskStack />
        <ComposerContextRail />
        {pendingApproval && queueChipShown ? null : (
          <div className="flex items-center gap-1.5 px-3 empty:hidden">
            <ComposerQueueChip />
          </div>
        )}
        <ComposerFollowupRail />
        <ComposerPreviousPreparingRail />
      </div>
    </>
  )
}
