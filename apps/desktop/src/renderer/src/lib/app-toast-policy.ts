/**
 * toast 停留规则：成功/信息 2400ms；错误或带动作一直停到用户关掉。
 * 显式传入有限 duration 时按该毫秒自熄（归档撤销 5s），不驻留。
 */
export const APP_TOAST_MS = 2400
export const ARCHIVE_UNDO_TOAST_MS = 5000

export type AppToastTone = "info" | "success" | "error"

export type AppToastAction = {
  label: string
  onClick: () => void
}

export type AppToastPolicyInput = {
  tone?: AppToastTone
  action?: AppToastAction
  duration?: number
}

export function hasExplicitToastDuration(input?: AppToastPolicyInput): boolean {
  return typeof input?.duration === "number" && Number.isFinite(input.duration)
}

export function shouldPersistAppToast(input?: AppToastPolicyInput): boolean {
  if (hasExplicitToastDuration(input)) return false
  return input?.tone === "error" || input?.action != null
}

export function resolveAppToastDuration(input?: AppToastPolicyInput): number {
  if (hasExplicitToastDuration(input)) return input.duration as number
  if (shouldPersistAppToast(input)) return Number.POSITIVE_INFINITY
  return APP_TOAST_MS
}
