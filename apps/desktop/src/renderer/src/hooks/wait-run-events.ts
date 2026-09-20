/**
 * 等一条非 Agent 生成跑完：先订阅再 start，避免 stub 在 IPC 返回前把事件发完。
 */
import { StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"

type RunSlot = { text: string; structured?: unknown; ended: boolean; error?: string }

export async function collectRunOutput(
  start: () => Promise<{ runId: string }>,
  timeoutMs = 20_000
): Promise<{ text: string; structured?: unknown }> {
  const slots = new Map<string, RunSlot>()
  let claimed: string | undefined
  let settled = false
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsub()
      reject(new Error("Timed out waiting for completion."))
    }, timeoutMs)
    const unsub = getIde().agent.onEvent((raw) => {
      const parsed = StreamEvent.safeParse(raw)
      if (!parsed.success || !("runId" in parsed.data) || !parsed.data.runId) return
      const slot = applyRunEvent(slots, parsed.data)
      if (claimed === parsed.data.runId && (slot.ended || slot.error)) finish()
    })
    void start()
      .then((result) => {
        claimed = result.runId
        const slot = slots.get(claimed)
        if (slot?.ended || slot?.error) finish()
      })
      .catch((error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsub()
        reject(error)
      })

    function finish() {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsub()
      const slot = claimed ? slots.get(claimed) : undefined
      if (slot?.error) {
        reject(new Error(slot.error))
        return
      }
      resolve({ text: (slot?.text ?? "").trim(), structured: slot?.structured })
    }
  })
}

function applyRunEvent(slots: Map<string, RunSlot>, event: StreamEvent): RunSlot {
  const runId = "runId" in event ? event.runId : undefined
  const slot = (runId && slots.get(runId)) || { text: "", ended: false }
  if (event.type === "text.delta") slot.text += event.text
  if (event.type === "structured.delta") slot.structured = event.partial
  if (event.type === "run.end") slot.ended = true
  if (event.type === "run.error") slot.error = event.message
  if (runId) slots.set(runId, slot)
  return slot
}
