/**
 * 融合轨一行：图标 + 标签 + 渐隐窥视 + 右侧动作。
 */
import type { ReactNode } from "react"
import { cx } from "@/utils/cx"
import {
  STACKED_ICON_CLASS_NAME,
  STACKED_LABEL_CLASS_NAME,
  STACKED_PEEK_CLASS_NAME,
  STACKED_ROW_CLASS_NAME
} from "./composer-stacked-styles"

export function ComposerStackedRow({
  icon,
  label,
  peek,
  meta,
  open,
  onToggle,
  actions,
  children,
  peekTestId
}: {
  icon: ReactNode
  label: string
  peek?: string
  meta?: ReactNode
  open?: boolean
  onToggle?: () => void
  actions?: ReactNode
  children?: ReactNode
  peekTestId?: string
}) {
  return (
    <div>
      <div className={STACKED_ROW_CLASS_NAME}>
        <span className={STACKED_ICON_CLASS_NAME}>{icon}</span>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
          >
            <span data-testid={peekTestId} className={STACKED_LABEL_CLASS_NAME}>
              {label}
            </span>
            {meta}
            {!open && peek ? (
              <span data-testid={peekTestId ? `${peekTestId}-sub` : undefined} className={STACKED_PEEK_CLASS_NAME}>
                {peek}
              </span>
            ) : null}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span data-testid={peekTestId} className={STACKED_LABEL_CLASS_NAME}>
              {label}
            </span>
            {meta}
            {peek ? (
              <span data-testid={peekTestId ? `${peekTestId}-sub` : undefined} className={STACKED_PEEK_CLASS_NAME}>
                {peek}
              </span>
            ) : null}
          </div>
        )}
        {actions}
      </div>
      {open && children ? (
        <div className="max-h-40 min-h-0 overflow-y-auto overscroll-contain px-3 pb-1.5 text-caption-2-regular text-text-secondary">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function stackedActionClass(extra?: string) {
  return cx(
    "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md",
    "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
    extra
  )
}
