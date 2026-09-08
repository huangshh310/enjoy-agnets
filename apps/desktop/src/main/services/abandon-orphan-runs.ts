/**
 * 启动时收拾上次进程没走 before-quit 留下的 running 行。
 * 内存 ActiveRun 已经没了，这些 run 无法续，只能标 cancelled。
 */
import { abandonRunningRuns } from "@enjoy-agents/db"
import { getDatabase } from "./database"

export function abandonOrphanRuns(): void {
  abandonRunningRuns(getDatabase())
}
