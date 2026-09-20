/**
 * M-D 本轮账本行。只读；文件行打开同一张「本轮来源」sheet。
 */
export const RUN_LEDGER_KINDS = ["read", "edit", "command", "error", "usage"] as const

export type RunLedgerKind = (typeof RUN_LEDGER_KINDS)[number]

/** 可折叠组（用量单独一行，不进组）。 */
export const LEDGER_GROUPS = ["read", "edit", "command", "error"] as const

export type LedgerGroupKind = (typeof LEDGER_GROUPS)[number]

export type RunLedgerEntry = {
  id: string
  kind: RunLedgerKind
  /** 语言无关短名：文件名或命令摘要，动词由 UI 拼。 */
  title: string
  fileName?: string
  /** 全路径，只进 hover / title。 */
  path?: string
  /** 目录次行，如 src/auth/… */
  pathHint?: string
  /** bash / git，命令主行左侧。 */
  toolLabel?: string
  /** 命令 stdout，默认不展示。 */
  output?: string
  /** 错误首行摘要；禁止整段 dump。 */
  detail?: string
  /** 对应本轮来源芯片，没有则只开展示账本详情。 */
  sourceChipId?: string
  failed?: boolean
  /** 已有耗时才写；没有就不编造。 */
  durationMs?: number
}

export type RunLedgerGroup = {
  kind: LedgerGroupKind
  entries: RunLedgerEntry[]
}
