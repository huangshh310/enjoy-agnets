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

/** 旧单槽口径（只剩测试与历史调用参考）：有草稿只出发送，空草稿运行中只出 Stop。界面走 composerActionButtons。 */
export function composerActionSlot(
  running: boolean,
  hasDraft: boolean
): "send" | "stop" | "none" {
  if (hasDraft) return "send"
  if (running) return "stop"
  return "none"
}

/**
 * E1 M3：运行中有草稿 → 停止 + 排队并排（排队留最右发送位，停止紧挨左侧）；
 * 运行中空草稿 → 只出停止（仍占最右槽）；空闲有草稿 → 只出发送；空闲空草稿 → 禁用发送占位。
 * `paired` = 两钮同时出现，底栏要收起过程 chip 让出 40px（luna §1.4 733 让位）。
 */
export type ComposerActionButtons = {
  stop: boolean
  send: "send" | "queue" | "none"
  paired: boolean
}

export function composerActionButtons(running: boolean, hasDraft: boolean): ComposerActionButtons {
  if (running) return { stop: true, send: hasDraft ? "queue" : "none", paired: hasDraft }
  return { stop: false, send: hasDraft ? "send" : "none", paired: false }
}

/** 引导时没有 ActiveRun：已 idle 立刻新开一轮，UI 仍 running 则改排队。 */
export function steerFallbackWhenNoRun(running: boolean): "send" | "queue" {
  return running ? "queue" : "send"
}
