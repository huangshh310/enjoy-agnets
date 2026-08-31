/**
 * 可恢复执行：把 GenerationRequest 收成 runs.checkpoint。不含密钥。
 */
import type { GenerationRequest } from "./types.ts"

export const GENERATION_CHECKPOINT_VERSION = 1 as const

export type GenerationCheckpoint = {
  version: typeof GENERATION_CHECKPOINT_VERSION
  request: GenerationRequest
}

export function snapshotGeneration(request: GenerationRequest): string {
  const { runtimeContext: _omit, ...safe } = request
  const checkpoint: GenerationCheckpoint = {
    version: GENERATION_CHECKPOINT_VERSION,
    request: safe
  }
  return JSON.stringify(checkpoint)
}

export function parseGenerationCheckpoint(raw: string | null | undefined): GenerationCheckpoint | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GenerationCheckpoint>
    if (parsed.version !== GENERATION_CHECKPOINT_VERSION || !parsed.request?.kind) return null
    return parsed as GenerationCheckpoint
  } catch {
    return null
  }
}

export function isWorkflowCheckpoint(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { stepIndex?: unknown; request?: unknown }
    return typeof parsed.stepIndex === "number" && parsed.request === undefined
  } catch {
    return false
  }
}
