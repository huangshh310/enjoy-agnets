/**
 * 二级页主卡片：article / wide / stage 走文档滚动；fill 把高度交给子页面（收件箱分栏）。
 */
import type { ReactNode } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cx } from "@/utils/cx"

export type SecondaryContentWidth = "article" | "wide" | "stage" | "fill"

export function SecondaryPageMain(props: {
  contentWidth: SecondaryContentWidth
  selectedItemLabel: string
  hideChrome?: boolean
  children: ReactNode
}) {
  const { contentWidth, selectedItemLabel, hideChrome, children } = props
  const fill = contentWidth === "fill"

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border-button-default/40 bg-background-primary-default shadow-card">
      {fill ? (
        <>
          {!hideChrome ? (
            <div className="shrink-0 px-5 pt-4">
              <SecondaryPageChrome label={selectedItemLabel} compact />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </>
      ) : (
        <ScrollArea className="h-full min-h-0">
          <div
            className={cx(
              "w-full",
              contentWidth === "article" && "mx-auto max-w-[760px] px-8 pt-7 pb-16",
              contentWidth === "wide" && "mx-auto max-w-5xl px-8 pt-7 pb-16",
              contentWidth === "stage" && "flex min-h-full flex-1 flex-col px-8 pt-5 pb-6"
            )}
          >
            {!hideChrome ? <SecondaryPageChrome label={selectedItemLabel} /> : null}
            {children}
          </div>
        </ScrollArea>
      )}
    </main>
  )
}

function SecondaryPageChrome(props: { label: string; compact?: boolean }) {
  return (
    <div
      className={cx(
        "border-b border-separator-border/60",
        props.compact ? "pb-3" : "mb-6 pb-3.5"
      )}
    >
      <p className="text-caption-1-semibold text-text-primary">{props.label}</p>
    </div>
  )
}
