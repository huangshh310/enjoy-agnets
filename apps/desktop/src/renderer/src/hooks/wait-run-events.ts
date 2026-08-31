/**
 * 等一条非 Agent 生成跑完：按 runId 收 text / structured，不直连 HTTP。
 */
import { StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

export function waitForRunOutput(
  runId: string,
  timeoutMs = 20_000
): Promise<{ text: string; structured?: unknown }> {
  return new Promise((resolve, reject) => {
    let text = ""
    let structured: unknown
    const timer = setTimeout(() => finish(), timeoutMs)
    const unsub = getIde().agent.onEvent((raw) => {
      const parsed = StreamEvent.safeParse(raw)
      if (!parsed.success) return
      const event = parsed.data
      if (!("runId" in event) || event.runId !== runId) return
      if (event.type === "text.delta") text += event.text
      if (event.type === "structured.delta") structured = event.partial
      if (event.type === "run.end") finish()
      if (event.type === "run.error") {
        clearTimeout(timer)
        unsub()
        reject(new Error(event.message))
      }
    })

    function finish() {
      clearTimeout(timer)
      unsub()
      resolve({ text: text.trim(), structured })
    }
  })
}
