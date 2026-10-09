/**
 * 统一 toast 入口：文案由调用方 t() 算好；停留规则见 app-toast-policy。
 */
import { toast } from "sonner"
import {
  resolveAppToastDuration,
  shouldPersistAppToast,
  type AppToastAction,
  type AppToastTone
} from "./app-toast-policy"

export { APP_TOAST_MS, resolveAppToastDuration, shouldPersistAppToast } from "./app-toast-policy"
export type { AppToastAction, AppToastTone }

export type ShowAppToastOptions = {
  id?: string
  duration?: number
  testId?: string
  tone?: AppToastTone
  action?: AppToastAction
}

export function showAppToast(message: string, options?: ShowAppToastOptions): void {
  const persist = shouldPersistAppToast(options)
  toast(message, {
    duration: resolveAppToastDuration(options),
    closeButton: persist,
    action: options?.action,
    id: options?.id,
    testId: options?.testId
  })
}
