/**
 * 全局 Toaster：sonner unstyled，皮只走 BoardUI token。
 * 底边由调用方按 clearance 实测传入；回落 APP_TOAST_BOTTOM_OFFSET。
 * sonner 2 用 ol mouseenter → expanded 暂停计时，ol/toast 必须能点到。
 */
import { Toaster as SonnerToaster } from "sonner"
import { cn } from "@/lib/utils"

/** 没有贴底 Composer 时的回落：状态栏 / 自动化页脚。归档撤销同一条。 */
export const APP_TOAST_BOTTOM_OFFSET = 56

const toastClass = cn(
  "pointer-events-auto flex h-10 min-h-10 items-center gap-1.5 rounded-full border border-border-button-default",
  "bg-background-primary-default px-4 text-caption-1-medium text-text-primary shadow-card"
)

export function Toaster({
  offsetLeft = 0,
  offsetBottom = APP_TOAST_BOTTOM_OFFSET
}: {
  offsetLeft?: number
  offsetBottom?: number
}) {
  return (
    <SonnerToaster
      className="pointer-events-auto"
      position="bottom-center"
      offset={{ bottom: offsetBottom, left: offsetLeft }}
      gap={8}
      expand={false}
      visibleToasts={3}
      duration={2400}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: toastClass,
          title: "text-caption-1-medium text-text-primary",
          description: "text-caption-2-regular text-text-secondary",
          actionButton:
            "rounded-md px-2 py-0.5 text-caption-2-medium text-accent-500 hover:bg-background-secondary-hover",
          cancelButton: "rounded-md px-2 py-0.5 text-caption-2-medium text-text-secondary",
          closeButton: cn(
            "absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center",
            "rounded-full border border-border-button-default bg-background-primary-default",
            "text-text-secondary shadow-xs hover:bg-background-primary-hover hover:text-text-primary"
          )
        }
      }}
    />
  )
}
