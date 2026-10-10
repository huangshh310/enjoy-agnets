/**
 * 输入框上方活动帽檐：改动一行、任务一行。子项全空则不画。
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
    <div className={`${STACKED_FRAME_CLASS_NAME} isolate`}>
      {pendingApproval ? null : <ComposerLiveChanges />}
      <ComposerTaskStack />
      <ComposerContextRail />
      <ComposerFollowupRail />
    </div>
  )
}
