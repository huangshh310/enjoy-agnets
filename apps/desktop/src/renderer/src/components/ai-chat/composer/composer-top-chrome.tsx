/**
 * Composer 顶栏：左探索|执行模式分段。
 * 模型选择与思考小档已下沉至底栏，对齐主流 AI IDE（Cursor / Windsurf / Claude）操作流。
 */
import { ExploreExecuteToggle } from "./explore-execute/explore-execute-toggle"

export function ComposerTopChrome() {
  return (
    <div className="flex items-center justify-between px-3 pt-1 pb-0.5">
      <ExploreExecuteToggle />
    </div>
  )
}
