/**
 * E1「停了就真停」：停止收尾回执契约（leo arch §4.2 / §5.1）。
 * main 等本轮副作用账本 settle（或到兜底上限）后补发 `run.stopped`；
 * `run.error(user_aborted)` 照旧立刻发，只在有在途副作用时多带 `settling`。
 */
import { z } from "zod"

/** 落定三态：确认没有写入 / 可能只做了一半 / 原子写恰好完成。拿不准一律 maybe_partial（fail-closed）。 */
export const StopWriteVerdict = z.enum(["none_confirmed", "maybe_partial", "completed"])
export type StopWriteVerdict = z.infer<typeof StopWriteVerdict>

/** 回执阶段：stuck = 8s 仍未 settle（快照）；settled / final 为终态，每轮只有一条。 */
export const RunStoppedPhase = z.enum(["stuck", "settled", "final"])
export type RunStoppedPhase = z.infer<typeof RunStoppedPhase>

export const StopEvidence = z.enum([
  "gate_blocked_before_start",
  "never_reached_executor",
  "fs_write_ok",
  "fs_write_error",
  "process_exited",
  "process_killed",
  "process_unconfirmed",
  "external_unverifiable",
  "deadline_reached"
])
export type StopEvidence = z.infer<typeof StopEvidence>

export const StopProcessExit = z.enum(["exited", "killed", "unconfirmed"])
export type StopProcessExit = z.infer<typeof StopProcessExit>

/** POSIX 进程组 ESRCH = confirmed；Windows taskkill /T = best_effort。 */
export const StopTreeCertainty = z.enum(["confirmed", "best_effort"])
export type StopTreeCertainty = z.infer<typeof StopTreeCertainty>

export const StopReceiptTool = z.object({
  toolCallId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  write: StopWriteVerdict,
  evidence: z.array(StopEvidence).max(16),
  exit: StopProcessExit.optional()
})
export type StopReceiptTool = z.infer<typeof StopReceiptTool>

export const StopReceipt = z.object({
  write: StopWriteVerdict,
  tools: z.array(StopReceiptTool).max(200),
  settledAt: z.number().int().optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
  tree: StopTreeCertainty.optional()
})
export type StopReceipt = z.infer<typeof StopReceipt>

/** `run.error` 上的可选收尾标记：只有 abort 时账本里有未 settle 条目才带。 */
export const RunErrorSettling = z.object({
  deadlineAt: z.number().int(),
  /**
   * 主进程收到 abort 的时刻（epoch ms）。与 8s stuck 计时起点相同（t0）。
   * 可选：旧事件没有该字段，渲染端可回落本地计时。
   */
  stopRequestedAt: z.number().int().optional().catch(undefined)
})
export type RunErrorSettling = z.infer<typeof RunErrorSettling>

/** UI 收尾上限（luna）：8s 未 settle 发 stuck。 */
export const STOP_STUCK_AFTER_MS = 8_000
/** 杀干净宽限：兜底上限 = 开始 / spawn + toolTimeoutMs + 该值。 */
export const STOP_KILL_GRACE_MS = 2_000
/** 渲染端本地兜底：deadlineAt + 该值仍无终态，按 maybe_partial 落定（防 IPC 丢包）。 */
export const STOP_RENDERER_FALLBACK_MS = 3_000
