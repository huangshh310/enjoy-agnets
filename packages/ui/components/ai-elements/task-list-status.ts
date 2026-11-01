/**
 * TaskList 状态文案与索引推导（无 React 组件）。
 */
import { uiT } from "@/i18n/ui-locale"
import type { TaskStatus } from "./task-list.types"

export { dockHonestyCounts } from "./task-list-honesty"

export function statusFromIndex(index: number, currentIndex?: number): TaskStatus {
  if (currentIndex === undefined) return "pending"
  if (index < currentIndex) return "completed"
  if (index === currentIndex) return "in_progress"
  return "pending"
}

export function isLiveProgress(status: TaskStatus | undefined, live: boolean): boolean {
  return status === "in_progress" && live
}

export function taskStatusLabel(status: TaskStatus, live: boolean): string {
  if (status === "completed") return uiT("完成", "Done")
  if (status === "failed") return uiT("失败", "Failed")
  if (status === "cancelled") return uiT("已停止", "Stopped")
  if (status === "in_progress" && live) return uiT("运行中", "Running now")
  if (status === "in_progress") return uiT("已停止", "Stopped")
  return uiT("待办", "Pending")
}
