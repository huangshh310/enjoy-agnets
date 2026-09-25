/**
 * CU overlay 停手势纯逻辑：先熄铬，再硬取消 in-flight act，再 abort 已知 runId。
 * 不发 StreamEvent。协议没有 cancel RPC，取消由调用方杀执行器在途请求。
 */

export type OverlayStopRun = { runId: string; pumping: boolean }

/** 显式 runId 优先，其次 ALS / 当前活泵。空串当没有。 */
export function resolveDesktopActRunId(
  explicit?: string,
  bound?: string,
  pumping?: string
): string | undefined {
  return firstId(explicit, bound, pumping)
}

export function inferPumpingRunId(runs: OverlayStopRun[]): string | undefined {
  return runs.find((item) => item.pumping)?.runId
}

/**
 * 停手势要 abort 的 run。已知 controllingRunId 时只打那一条，禁止扫全部 ActiveRun。
 * 未知时退回活泵；再没有才退回全部（Dock 推断兜底）。
 */
export function stopOverlayAbortRunIds(
  controllingRunId: string | undefined,
  runs: OverlayStopRun[]
): string[] {
  const known = firstId(controllingRunId)
  if (known) return [known]
  const pumping = runs.filter((item) => item.pumping)
  return (pumping.length ? pumping : runs).map((item) => item.runId)
}

/** 一键停 / Esc：dim → executor cancel → abort。预览只熄，不 abort。 */
export async function runDesktopOverlayStop(input: {
  controllingRunId?: string
  previewOnly: boolean
  runs: OverlayStopRun[]
  endOverlay: () => void
  cancelInFlight: () => void
  abortAgent: (runId: string) => Promise<unknown>
}): Promise<void> {
  const runId = input.controllingRunId
  const wasPreview = input.previewOnly
  input.endOverlay()
  if (wasPreview) return
  input.cancelInFlight()
  for (const id of stopOverlayAbortRunIds(runId, input.runs)) {
    await input.abortAgent(id)
  }
}

function firstId(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const next = value?.trim()
    if (next) return next
  }
  return undefined
}
