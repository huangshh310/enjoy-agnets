/**
 * TaskList 组件类型契约定义。
 */
export interface TaskItem {
  id?: string
  title: string
  status?: "pending" | "in_progress" | "completed"
}

export interface TaskListProps {
  title?: string
  tasks: Array<TaskItem | string>
  currentIndex?: number
  defaultCollapsed?: boolean
  className?: string
  variant?: "card" | "dock"
  /** 当前 Agent 是否在跑。false 时 in_progress 显示为已停止，不要空转「运行中」。 */
  live?: boolean
  /** 停跑且任务未完成时，点「继续」再开一轮。 */
  onContinue?: () => void
  /** 额外的右侧快捷操作（如关联的预览/链接按钮）。 */
  action?: React.ReactNode
  /** 控制舱底部附加区域（如合并展示的文件改动栏）。 */
  footer?: React.ReactNode
}

export type TaskStatus = NonNullable<TaskItem["status"]>

export type NormalizedTask = {
  title: string
  status: TaskStatus
}
