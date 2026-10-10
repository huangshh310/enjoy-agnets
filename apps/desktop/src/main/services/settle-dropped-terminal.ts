/**
 * 出站闸丢掉终态事件时，抽出 waitForRunSettle 兜底，避免挂死。
 * 另给 renderer 补一条能过闸的最小 run.error，避免界面停在转圈。
 */
export function droppedTerminalSettle(event: unknown): {
  runId: string
  status: "end" | "error"
  summary: string
} | null {
  if (!event || typeof event !== "object") return null
  const rec = event as { type?: unknown; runId?: unknown; message?: unknown }
  if (rec.type !== "run.end" && rec.type !== "run.error") return null
  if (typeof rec.runId !== "string" || !rec.runId.trim()) return null
  return {
    runId: rec.runId,
    status: rec.type === "run.end" ? "end" : "error",
    summary: rec.type === "run.error" && typeof rec.message === "string" ? rec.message : ""
  }
}

/** 闸丢掉终态后，补一条最小可过闸的 run.error 给界面。 */
export function droppedTerminalRescue(event: unknown): {
  type: "run.error"
  runId: string
  message: string
} | null {
  const settle = droppedTerminalSettle(event)
  if (!settle) return null
  return {
    type: "run.error",
    runId: settle.runId,
    message: settle.summary.trim() || "run failed"
  }
}
