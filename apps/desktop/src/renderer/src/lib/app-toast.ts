/**
 * 统一 toast 入口：文案由调用方 t() 算好，时长对齐旧手写条。
 */
import { toast } from "sonner"

export const APP_TOAST_MS = 2400

export type ShowAppToastOptions = {
  id?: string
  duration?: number
  testId?: string
}

export function showAppToast(message: string, options?: ShowAppToastOptions): void {
  toast(message, {
    duration: options?.duration ?? APP_TOAST_MS,
    id: options?.id,
    testId: options?.testId
  })
}
