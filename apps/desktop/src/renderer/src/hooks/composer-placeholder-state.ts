/**
 * 输入框占位符选哪句（mike P3，#163 巡检 61：暂停中来审批，占位符仍说「任务进行中。Enter 排队…」，和排队行「已暂停」矛盾）。
 * - 没在跑：打回后的提示句（有的话）或默认句；
 * - 在跑、队列停着（停止 / 出错 / 额度 / 换助手后又来了审批）：Enter 仍是排进去，但不会自己发，要点「继续」——换一句说清楚；
 * - 在跑、队列没停：原来的「任务进行中。Enter 排队，⌘/Ctrl+Enter 马上发给它…」。
 */
export type ComposerPlaceholderKey = "chat.placeholder" | "chat.placeholderRunning" | "chat.placeholderRunningPaused"

export function composerPlaceholderKey(input: { running: boolean; queuePaused: boolean }): ComposerPlaceholderKey {
  if (!input.running) return "chat.placeholder"
  return input.queuePaused ? "chat.placeholderRunningPaused" : "chat.placeholderRunning"
}
