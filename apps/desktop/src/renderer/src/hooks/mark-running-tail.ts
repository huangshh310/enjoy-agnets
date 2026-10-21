/**
 * #160 巡检 5（luna 6-02b）：切回一个还在跑 / 还在等审批的会话，消息只从库行回灌，库行没有 streaming 标记，
 * 于是思考行用了过去时「已运行 1 个工具」、结束态按钮（复制 / 重新生成…）也提前出来。
 * 会话自己还在跑时，把最后一条用户话之后的那条助手话标成 streaming，和没离开时一样。
 */
type Msg = { role: string; streaming?: boolean }

export function markRunningTail<T extends Msg>(messages: T[], running: boolean): T[] {
  if (!running) return messages
  let lastUser = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === "user") {
      lastUser = i
      break
    }
  }
  let tail = -1
  for (let i = messages.length - 1; i > lastUser; i--) {
    if (messages[i]!.role === "assistant") {
      tail = i
      break
    }
  }
  if (tail < 0 || messages[tail]!.streaming) return messages
  return messages.map((message, index) => (index === tail ? { ...message, streaming: true } : message))
}
