/**
 * Studio 舞台顶栏：面包屑、Quick Search、New Chat。
 */
import { RiAddLine, RiDashboardLine, RiSearchLine } from "@remixicon/react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { openQuickSearch } from "@renderer/components/search/quick-search-dialog"
import { useT } from "@renderer/i18n"

export function StudioHeader({ onNewChat }: { onNewChat: () => void }) {
  const t = useT()

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-separator-border/60 px-6">
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
          <RiDashboardLine className="size-3.5" />
        </div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <span className="text-caption-1-medium font-semibold text-text-primary">{t("common.agentStudio")}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-caption-1-medium text-text-secondary">
                {t("studio.header.controlCenter")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openQuickSearch} className="h-8 gap-1.5 text-caption-2-medium">
          <RiSearchLine className="size-3.5 text-text-tertiary" />
          <span>{t("common.quickSearch")}</span>
          <kbd className="rounded bg-background-tertiary-default px-1 font-mono text-[10px] text-text-secondary">
            ⌘L
          </kbd>
        </Button>
        <Button size="sm" onClick={onNewChat} className="h-8 gap-1.5 shadow-xs">
          <RiAddLine className="size-4" />
          <span>{t("studio.newChat")}</span>
        </Button>
      </div>
    </header>
  )
}
