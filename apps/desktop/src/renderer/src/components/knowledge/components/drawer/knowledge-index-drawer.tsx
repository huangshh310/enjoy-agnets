/**
 * 索引管理面板：默认收起，在舞台与 Bento 下方页内展开。
 */
import { useEffect, useRef } from "react"
import { RiAddLine, RiCloseLine, RiDatabase2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { KnowledgeDocumentsTable } from "../../knowledge-documents-table"
import type { KnowledgeDocumentsTableProps } from "../../knowledge-table.types"

interface KnowledgeIndexDrawerProps extends KnowledgeDocumentsTableProps {
  open: boolean
  onClose: () => void
  onOpenAddModal: () => void
}

export function KnowledgeIndexDrawer({
  open,
  onClose,
  onOpenAddModal,
  sources,
  documents,
  indexingSourceId,
  selectedPath,
  documentsLoading,
  documentsError,
  citedPaths,
  onRebuildIndex,
  onRemoveSource,
  onEditSource,
  onPreviewDocument,
  onQuickSearchSource,
  onViewSource
}: KnowledgeIndexDrawerProps) {
  const t = useT()
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [open])

  if (!open) return null

  return (
    <section
      ref={panelRef}
      id="knowledge-index-panel"
      className="flex flex-col overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default shadow-card"
    >
      <header className="flex items-center justify-between border-b border-separator-border/60 bg-background-secondary-default/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10 text-accent-600 shadow-2xs dark:text-accent-400">
            <RiDatabase2Line className="size-5" />
          </div>
          <div>
            <h3 className="text-title-3-semibold text-text-primary">{t("pages.knowledge.indexPanelTitle")}</h3>
            <p className="text-caption-2-regular text-text-tertiary">{t("pages.knowledge.indexPanelHint")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary"
          aria-label={t("pages.knowledge.closePanel")}
        >
          <RiCloseLine className="size-5" />
        </button>
      </header>
      <div className="flex flex-col gap-4 p-6">
        <KnowledgeDocumentsTable
          sources={sources}
          documents={documents}
          indexingSourceId={indexingSourceId}
          selectedPath={selectedPath}
          documentsLoading={documentsLoading}
          documentsError={documentsError}
          citedPaths={citedPaths}
          onRebuildIndex={onRebuildIndex}
          onRemoveSource={onRemoveSource}
          onEditSource={onEditSource}
          onPreviewDocument={onPreviewDocument}
          onQuickSearchSource={onQuickSearchSource}
          onViewSource={onViewSource}
        />
      </div>
      <footer className="flex items-center justify-between border-t border-separator-border/60 px-6 py-4">
        <span className="text-caption-2-regular text-text-tertiary">
          {t("pages.knowledge.indexPanelCount", { sources: sources.length, docs: documents.length })}
        </span>
        <div className="flex items-center gap-2.5">
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 px-3 text-caption-2-medium">
            {t("pages.knowledge.doneCollapse")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAddModal}
            className="h-8 gap-1.5 px-3.5 text-caption-2-medium"
          >
            <RiAddLine className="size-3.5" />
            <span>{t("pages.knowledge.addSource")}</span>
          </Button>
        </div>
      </footer>
    </section>
  )
}
