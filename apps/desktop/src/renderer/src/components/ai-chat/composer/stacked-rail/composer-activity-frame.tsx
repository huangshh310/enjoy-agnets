/**
 * 输入框上方活动帽檐：改动一行、任务一行。子项全空则不画。
 */
import { STACKED_FRAME_CLASS_NAME } from "./composer-stacked-styles"
import { ComposerLiveChanges } from "./composer-live-changes"
import { ComposerTaskStack } from "./composer-task-stack"
import { ComposerContextRail } from "./composer-context-rail"
import { ComposerFollowupRail } from "../runtime-interact/composer-followup-rail"

export function ComposerActivityFrame() {
  return (
    <div className={`${STACKED_FRAME_CLASS_NAME} isolate`}>
      <ComposerLiveChanges />
      <ComposerTaskStack />
      <ComposerContextRail />
      <ComposerFollowupRail />
    </div>
  )
}
