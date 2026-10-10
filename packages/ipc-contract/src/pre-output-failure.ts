/**
 * 模型还没吐字就失败：回滚本轮气泡，不进前台「失败」。
 */
import { z } from "zod"
import {
  CREDENTIAL_INVALID,
  PROVIDER_BILLING,
  PROVIDER_FORBIDDEN,
  PROVIDER_UNREACHABLE
} from "./credential-check.ts"
import { NO_CHAT_ROUTE } from "./chat-route-gate.ts"

export const PRE_OUTPUT_FAILURE_CODES = z.enum([
  CREDENTIAL_INVALID,
  PROVIDER_UNREACHABLE,
  PROVIDER_FORBIDDEN,
  PROVIDER_BILLING,
  NO_CHAT_ROUTE
])
export type PreOutputFailureCode = z.infer<typeof PRE_OUTPUT_FAILURE_CODES>

export const CLIENT_REQUEST_ID_MAX = 80
export const CLIENT_REQUEST_DEDUP_MS = 60_000

const PRODUCED_OUTPUT_TYPES = new Set([
  "text.delta",
  "reasoning.delta",
  "tool.start",
  "approval.required",
  "source.added"
])

/** 开泵前的 cite `source.added` 不算产出，否则连不上供应商也会留下气泡。 */
export function eventMarksProducedOutput(event: { type: string }, pumping: boolean): boolean {
  if (event.type === "source.added") return pumping
  return PRODUCED_OUTPUT_TYPES.has(event.type)
}

export function isPreOutputFailureCode(code: string | undefined): code is PreOutputFailureCode {
  return PRE_OUTPUT_FAILURE_CODES.safeParse(code).success
}
