/**
 * 任务栈诚实态文案（无 React）。
 */
export type StackTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"

type TFn = (key: string, params?: Record<string, string | number>) => string

export function stackedTasksLabel(
  t: TFn,
  done: number,
  total: number,
  honesty: { failed: number; stopped: number }
): string {
  let label = t("chat.stackedTasksProgress", { done, total })
  if (honesty.failed > 0) label += ` · ${honesty.failed} ${t("chat.taskFailed")}`
  if (honesty.stopped > 0) label += ` · ${honesty.stopped} ${t("chat.taskStopped")}`
  return label
}

export function stackRowStatusLabel(
  t: (key: string) => string,
  status: StackTaskStatus,
  live: boolean
): string | null {
  if (status === "failed") return t("chat.taskFailed")
  if (status === "cancelled" || (status === "in_progress" && !live)) return t("chat.taskStopped")
  return null
}
