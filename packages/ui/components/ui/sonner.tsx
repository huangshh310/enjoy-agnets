/**
 * 全局 Toaster：sonner unstyled，皮只走 BoardUI token。
 */
import { Toaster as SonnerToaster } from "sonner"
import { cn } from "@/lib/utils"

/** 底中抬高，避开状态栏 / 自动化页脚。归档撤销条同一条规则。 */
export const APP_TOAST_BOTTOM_OFFSET = 56

const toastClass = cn(
  "flex items-center gap-1.5 rounded-full border border-border-button-default",
  "bg-background-primary-default px-4 py-2 text-caption-1-medium text-text-primary shadow-card"
)

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={{ bottom: APP_TOAST_BOTTOM_OFFSET }}
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
