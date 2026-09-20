/**
 * M-D 本轮账本行。只读；点行打开同一张「本轮来源」sheet。
 */
export const RUN_LEDGER_KINDS = ["tool", "command", "error", "usage"] as const

export type RunLedgerKind = (typeof RUN_LEDGER_KINDS)[number]

export type RunLedgerEntry = {
  id: string
  kind: RunLedgerKind
  title: string
  /** 已有耗时才写；没有就不编造。 */
  durationMs?: number
  detail?: string
  /** 对应本轮来源芯片，没有则只开展示账本详情。 */
  sourceChipId?: string
  failed?: boolean
}
