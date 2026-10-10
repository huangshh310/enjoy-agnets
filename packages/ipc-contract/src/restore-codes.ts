/**
 * 重启回挂收工码。空闲 Composer 只认这一家，标题补全超时不得进横幅。
 */
export const RESTORE_NO_MATCHING_CODE = "restore_no_matching_approval"
/** kill-9 / 缺检查点等：未决 cancelled（restart），run 记停止。 */
export const RESTORE_RESTART_CANCELLED = "restore_restart_cancelled"

export const RESTORE_FAMILY_CODES = [
  RESTORE_NO_MATCHING_CODE,
  RESTORE_RESTART_CANCELLED
] as const

export type RestoreFamilyCode = (typeof RESTORE_FAMILY_CODES)[number]

export function isRestoreFamilyCode(value: string | undefined | null): value is RestoreFamilyCode {
  return value === RESTORE_NO_MATCHING_CODE || value === RESTORE_RESTART_CANCELLED
}

export function restoreFamilyCodeOf(event: {
  code?: string
  message?: string
}): RestoreFamilyCode | undefined {
  if (isRestoreFamilyCode(event.code)) return event.code
  if (isRestoreFamilyCode(event.message)) return event.message
  return undefined
}
