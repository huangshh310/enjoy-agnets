/**
 * toast 停留规则：成功/信息 2400ms；错误或带动作一直停到用户关掉。
 */
export const APP_TOAST_MS = 2400

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

export function shouldPersistAppToast(input?: AppToastPolicyInput): boolean {
  return input?.tone === "error" || input?.action != null
}

export function resolveAppToastDuration(input?: AppToastPolicyInput): number {
  if (shouldPersistAppToast(input)) return Number.POSITIVE_INFINITY
  return input?.duration ?? APP_TOAST_MS
}
