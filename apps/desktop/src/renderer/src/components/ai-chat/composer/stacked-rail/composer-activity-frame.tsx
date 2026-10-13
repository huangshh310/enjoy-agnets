/**
 * 输入框上方活动帽檐：改动 / 待验收单独一框，任务 / 目标 / 追问另一框。子项全空则不画。
 * 待验收框与 Composer 同宽、左右对齐；窄矮窗口里它可被压扁，展开区在框内滚动，不盖消息。
 * 有审批卡时不画改动条，避免「N 个文件已改」盖住 Dock 底栏按钮。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { STACKED_FRAME_CLASS_NAME } from "./composer-stacked-styles"
import { ComposerLiveChanges } from "./composer-live-changes"
import { ComposerTaskStack } from "./composer-task-stack"
import { ComposerContextRail } from "./composer-context-rail"
import { ComposerFollowupRail } from "../runtime-interact/composer-followup-rail"

export function ComposerActivityFrame() {
  const pendingApproval = useChatStore((state) => state.pendingApproval)
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
        <ComposerFollowupRail />
      </div>
    </>
  )
}
