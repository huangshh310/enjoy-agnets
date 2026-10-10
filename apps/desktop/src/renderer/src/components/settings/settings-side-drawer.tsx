/**
 * 设置侧边抽屉：portal 到 body，避免被上级 overflow / transform 裁切。
 * nested 叠在另一只抽屉上（供应商 CRUD 已回到 `#/settings/providers`，不再从智能体抽屉叠新建）。
 */
import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cx } from "@/utils/cx"
import { APP_REGION_NO_DRAG_STYLE } from "@renderer/lib/app-region"
import { isAppDialogOpen, markDrawerEscapeHandled, shouldCloseDrawerOnEscape } from "./settings-drawer-close"
import { SETTINGS_DRAWER_Z_CLASS } from "./settings-overlay"

export function SettingsSideDrawer({
  open,
  onClose,
  labelledBy,
  closeLabel,
  layer = "base",
  widthClass = "w-[min(32rem,calc(100vw-1.5rem))]",
  children
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  closeLabel: string
  layer?: "base" | "nested"
  widthClass?: string
  children: ReactNode
}) {
  const nested = layer === "nested"

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (!shouldCloseDrawerOnEscape(event)) return
      if (isAppDialogOpen()) return
      markDrawerEscapeHandled(event)
      onClose()
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [open, onClose, nested])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className={cx("fixed inset-0 [app-region:no-drag]", nested ? SETTINGS_DRAWER_Z_CLASS.nested : SETTINGS_DRAWER_Z_CLASS.base)}
      data-app-region="no-drag"
      data-settings-drawer="open"
      style={APP_REGION_NO_DRAG_STYLE}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        aria-label={closeLabel}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          "absolute inset-y-3 right-3 flex flex-col overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default shadow-card animate-in slide-in-from-right duration-250",
          widthClass
        )}
      >
        {children}
      </aside>
    </div>,
    document.body
  )
}
