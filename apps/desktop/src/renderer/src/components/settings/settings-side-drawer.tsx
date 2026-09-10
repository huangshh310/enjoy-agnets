/**
 * 设置侧边抽屉：portal 到 body，避免被上级 overflow / transform 裁切。
 * nested 叠在另一只抽屉上（智能体里加供应商）。
 */
import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cx } from "@/utils/cx"
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
      if (event.key !== "Escape") return
      if (event.defaultPrevented) return
      const target = event.target
      if (target instanceof Element && target.closest("[data-slot='popover-content'], [data-slot='dropdown-menu-content'], [role='listbox']")) {
        return
      }
      event.preventDefault()
      if (nested) event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener("keydown", onKeyDown, { capture: nested })
    return () => window.removeEventListener("keydown", onKeyDown, { capture: nested })
  }, [open, onClose, nested])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className={cx("fixed inset-0", nested ? SETTINGS_DRAWER_Z_CLASS.nested : SETTINGS_DRAWER_Z_CLASS.base)}>
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
