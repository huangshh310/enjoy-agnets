/**
 * jojo P1 / P2（#136 gate2）：出字前回滚撕掉本轮用户句后的收尾钩子（自动标题复原等）。
 * 无依赖小模块：chat-store 只管通知，订阅方（session-title）不反向被 chat-store 引入，免循环依赖。
 */
export type PreOutputRolledBack = {
  sessionId: string
  /** 回滚后线程里还剩的用户句数；0 = 这是会话的第一句，自动标题来自它。 */
  userTurnsLeft: number
}

const listeners = new Set<(info: PreOutputRolledBack) => void>()

export function onPreOutputRolledBack(listener: (info: PreOutputRolledBack) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitPreOutputRolledBack(info: PreOutputRolledBack): void {
  for (const listener of listeners) {
    try {
      listener(info)
    } catch {
      // 收尾钩子失败不影响回滚本身
    }
  }
}

/**
 * leo r3 M2：这一轮真出字了（模型文本 / 思考 / 工具 / 审批）或 run.end——首句自动标题从此不再是「可撤回」的。
 */
const outputListeners = new Set<(sessionId: string) => void>()

export function onTurnProducedOutput(listener: (sessionId: string) => void): () => void {
  outputListeners.add(listener)
  return () => outputListeners.delete(listener)
}

export function emitTurnProducedOutput(sessionId: string): void {
  for (const listener of outputListeners) {
    try {
      listener(sessionId)
    } catch {
      // 忽略
    }
  }
}
