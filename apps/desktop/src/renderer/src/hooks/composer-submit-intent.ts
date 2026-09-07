/**
 * 运行中 Enter 排队，⌘/Ctrl+Enter 纠偏；空闲一律发送。
 * hasDraft 由调用方计入引用 Chip / 知识 Chip，不能只看输入框字符串。
 */
export type ComposerSubmitIntent = "send" | "queue" | "steer"

export function resolveComposerIntent(
  running: boolean,
  requested: ComposerSubmitIntent,
  metaKey = false
): ComposerSubmitIntent {
  if (!running) return "send"
  if (requested === "steer" || metaKey) return "steer"
  return "queue"
}

/** Stop 与发送互斥：有草稿只出发送，空草稿运行中只出 Stop。 */
export function composerActionSlot(
  running: boolean,
  hasDraft: boolean
): "send" | "stop" | "none" {
  if (hasDraft) return "send"
  if (running) return "stop"
  return "none"
}

/** 引导时没有 ActiveRun：已 idle 立刻新开一轮，UI 仍 running 则改排队。 */
export function steerFallbackWhenNoRun(running: boolean): "send" | "queue" {
  return running ? "queue" : "send"
}
