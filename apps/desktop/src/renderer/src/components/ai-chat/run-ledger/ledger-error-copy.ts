/**
 * 账本错误人话：已知英文工具/结果句映射；未知英文用泛句；原文只进开发者档。
 */
export const LEDGER_ERROR_NO_RESULT_KEY = "sessionOps.ledgerErrorNoResult"
export const LEDGER_ERROR_GENERIC_KEY = "sessionOps.ledgerErrorGeneric"

const KNOWN_ERROR_KEYS: Record<string, string> = {
  "no result received.": LEDGER_ERROR_NO_RESULT_KEY,
  "no result received": LEDGER_ERROR_NO_RESULT_KEY,
  "tool call failed.": LEDGER_ERROR_GENERIC_KEY,
  "tool call failed": LEDGER_ERROR_GENERIC_KEY
}

export function normalizeLedgerErrorRaw(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase()
}

export function ledgerErrorLooksEnglish(raw: string): boolean {
  const text = raw.trim()
  if (!text) return false
  if (/[\u4e00-\u9fff]/.test(text)) return false
  return /[A-Za-z]/.test(text)
}

export function ledgerErrorCopyKey(raw: string): string | null {
  const known = KNOWN_ERROR_KEYS[normalizeLedgerErrorRaw(raw)]
  if (known) return known
  if (ledgerErrorLooksEnglish(raw)) return LEDGER_ERROR_GENERIC_KEY
  return null
}

export function formatLedgerErrorUserText(
  raw: string,
  t: (key: string) => string,
  dev: boolean
): string {
  const line = raw.trim().split("\n")[0]?.trim() ?? ""
  if (!line) return t(LEDGER_ERROR_GENERIC_KEY)
  const key = ledgerErrorCopyKey(line)
  const shown = key ? t(key) : line
  if (dev && key) return `${shown} · ${line}`
  return shown
}

/** 默认面不得把未翻译英文错误摊给用户。 */
export function ledgerErrorLeaksEnglish(shown: string, raw: string, dev: boolean): boolean {
  if (dev) return false
  if (!ledgerErrorLooksEnglish(raw)) return false
  return shown.includes(raw.trim().split("\n")[0]?.trim() ?? raw)
}
