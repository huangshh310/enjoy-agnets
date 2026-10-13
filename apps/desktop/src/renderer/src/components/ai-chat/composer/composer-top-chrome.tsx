/**
 * Composer 顶栏：左探索|执行模式分段。
 * 模型选择与思考小档已下沉至底栏，对齐主流 AI IDE（Cursor / Windsurf / Claude）操作流。
 */
import { ExploreExecuteToggle } from "./explore-execute/explore-execute-toggle"

export function ComposerTopChrome() {
  return (
    <div
      // 极矮窗（≤440）有审批卡时让出这一行，三钮与卡顶留在可视区（leo / luna #149）。
      className="flex items-center justify-between px-3 pt-1 pb-0.5 [@media(max-height:440px)]:[body:has([data-testid=permission-dock])_&]:hidden"
    >
      <ExploreExecuteToggle />
    </div>
  )
}
