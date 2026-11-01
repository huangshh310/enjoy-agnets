/**
 * 任务坞诚实态计数：失败 / 已停止。无 React、无 i18n。
 */
import type { NormalizedTask } from "./task-list.types"

/** 折叠坞诚实态计数：失败 + 已停止（cancelled 或 in_progress 且非 live）。 */
export function dockHonestyCounts(rows: NormalizedTask[], live: boolean): {
  failed: number
  stopped: number
} {
  let failed = 0
  let stopped = 0
  for (const task of rows) {
    if (task.status === "failed") failed += 1
    else if (task.status === "cancelled" || (task.status === "in_progress" && !live)) stopped += 1
  }
  return { failed, stopped }
}
