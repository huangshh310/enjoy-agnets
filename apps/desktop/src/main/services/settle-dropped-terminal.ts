/**
 * 出站闸丢掉终态事件时，抽出 waitForRunSettle 兜底，避免挂死。
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
