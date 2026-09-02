/**
 * 知识页顶栏：标题、本地文件计数、检索与导入入口。
 */
import { RiAddLine, RiBookOpenLine, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

type KnowledgePageHeaderProps = {
  fileCount: number
  chunkCount: number
  isRetrieverOpen: boolean
  onToggleRetriever: () => void
  onAdd: () => void
}

export function KnowledgePageHeader({
  fileCount,
  chunkCount,
  isRetrieverOpen,
  onToggleRetriever,
  onAdd
}: KnowledgePageHeaderProps) {
  const t = useT()
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
          <RiBookOpenLine className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 data-testid="page-knowledge" className="text-title-3-semibold text-text-primary">
              {t("pages.knowledge.title")}
            </h1>
            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-caption-2-medium text-accent-500">
              {t("pages.knowledge.localOnly")}
            </span>
          </div>
          <p className="mt-0.5 text-caption-1-medium text-text-secondary">
            {t("pages.knowledge.stats", { fileCount, chunkCount })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isRetrieverOpen ? "default" : "outline"}
          onClick={onToggleRetriever}
          className="gap-1.5 shadow-xs"
        >
          <RiSearchLine className="size-4" />
          <span>{isRetrieverOpen ? t("pages.knowledge.hideTester") : t("pages.knowledge.testRetrieval")}</span>
        </Button>
        <Button size="sm" onClick={onAdd} className="gap-1.5 shadow-xs">
          <RiAddLine className="size-4" />
          <span>{t("pages.knowledge.addImport")}</span>
        </Button>
      </div>
    </header>
  )
}
