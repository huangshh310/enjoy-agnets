/**
 * 二级页主卡片：article / wide / stage 走文档滚动；fill 把高度交给子页面（收件箱分栏）。
 */
import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RiDashboardLine } from "@remixicon/react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export type SecondaryContentWidth = "article" | "wide" | "stage" | "fill"

export function SecondaryPageMain(props: {
  contentWidth: SecondaryContentWidth
  selectedItemLabel: string
  children: ReactNode
}) {
  const { contentWidth, selectedItemLabel, children } = props
  const fill = contentWidth === "fill"

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-button-default/40 bg-background-primary-default shadow-card">
      {fill ? (
        <>
          <div className="shrink-0 px-5 pt-4">
            <SecondaryPageChrome label={selectedItemLabel} compact />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </>
      ) : (
        <ScrollArea className="h-full">
          <div
            className={cx(
              "w-full",
              contentWidth === "article" && "mx-auto max-w-[760px] px-8 pt-7 pb-16",
              contentWidth === "wide" && "mx-auto max-w-5xl px-8 pt-7 pb-16",
              contentWidth === "stage" && "flex min-h-full flex-col px-8 pt-6 pb-16"
            )}
          >
            <SecondaryPageChrome label={selectedItemLabel} />
            {children}
          </div>
        </ScrollArea>
      )}
    </main>
  )
}

function SecondaryPageChrome(props: { label: string; compact?: boolean }) {
  const t = useT()
  return (
    <div
      className={cx(
        "flex items-center justify-between border-b border-separator-border/60",
        props.compact ? "pb-3" : "mb-6 pb-3.5"
      )}
    >
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link
              to="/studio"
              className="flex items-center gap-1.5 text-caption-1-medium text-text-secondary transition-colors hover:text-accent-600 dark:hover:text-accent-400"
            >
              <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
                <RiDashboardLine className="size-3.5" />
              </div>
              <span>{t("common.agentStudio")}</span>
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-caption-1-medium font-semibold text-text-primary">
              {props.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Link
          to="/studio"
          className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          <RiDashboardLine className="size-3.5" />
          <span>{t("common.studioHub")}</span>
        </Link>
        <span className="text-border-button-default">|</span>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-caption-2-medium text-text-tertiary transition-colors hover:text-text-primary"
        >
          <span>{t("common.chatStage")}</span>
        </Link>
      </div>
    </div>
  )
}
