/**
 * Diff 文件级「留下 / 丢掉」决策（#117）。
 * 不做 hunk；流式未完成不可决；已决可折 stub。
 */
export type FileDiffDecision = "pending" | "kept" | "discarded"

export function canDecideFileDiff(input: {
  streaming?: boolean
  toolState?: string
}): boolean {
  if (input.streaming) return false
  const state = input.toolState
  if (!state) return true
  return state === "output-available" || state === "output-error" || state === "output-denied"
}

export function nextDecision(
  current: FileDiffDecision,
  action: "keep" | "discard"
): FileDiffDecision {
  if (action === "keep") return "kept"
  return "discarded"
}
