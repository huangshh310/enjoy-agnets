/**
 * 知识库文档侧边抽屉 (Document Preview Drawer)。
 * 取代传统居中窄弹窗，采用桌面级侧边滑出抽屉，提供宽阔视野与等宽行号视口。
 */
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiFileTextLine,
  RiLoader4Line,
  RiSearchLine
} from "@remixicon/react"
import type { KnowledgeDocumentItem } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"

import { hasIde } from "@renderer/lib/ide"
import { readWorkspaceFile } from "@renderer/lib/read-workspace-file"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { getPathExtension, knowledgeDocumentStatusLabel } from "./knowledge-table-format"

interface KnowledgeFilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: KnowledgeDocumentItem | null
  onSearchInFile?: (path: string) => void
}

export function KnowledgeFilePreviewModal({
  isOpen,
  onClose,
  document,
  onSearchInFile
}: KnowledgeFilePreviewModalProps) {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    if (isOpen) window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  const fileContentQuery = useQuery({
    queryKey: ["knowledge-file-content", workspaceId, document?.path],
    enabled: hasIde() && Boolean(workspaceId) && Boolean(document) && isOpen,
    queryFn: async () => {
      if (!workspaceId || !document) return ""
      try {
        return await readWorkspaceFile(workspaceId, document.path)
      } catch (err) {
        return t("pages.knowledge.readFileError", { err: String(err) })
      }
    }
  })

  if (!isOpen || !document) return null

  const content = fileContentQuery.data ?? ""
  const lines = content.split("\n")
  const ext = getPathExtension(document.path)?.toUpperCase() ?? t("pages.knowledge.fileFallback")

  function handleCopy() {
    if (!content) return
    void navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        aria-label={t("pages.knowledge.closePanel")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-drawer-title"
        className="absolute inset-y-3 right-3 flex w-[min(54rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default shadow-card animate-in slide-in-from-right duration-250"
      >
        <header className="flex items-center justify-between border-b border-separator-border/60 bg-background-secondary-default/30 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 font-mono text-caption-2-medium font-bold text-accent-500 shadow-2xs">
              {ext}
            </div>
            <div className="min-w-0">
              <h3 id="preview-drawer-title" className="truncate text-title-3-semibold text-text-primary">
                {document.path}
              </h3>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-caption-2-regular text-text-tertiary">
                <span>{t("pages.knowledge.vectorChunks", { n: document.chunkCount })}</span>
                <span>·</span>
                <span>{t("pages.knowledge.linesCount", { n: lines.length })}</span>
                <span>·</span>
                <span>{knowledgeDocumentStatusLabel(t, document.status, document.chunkCount)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSearchInFile ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onSearchInFile(document.path)
                  onClose()
                }}
                className="h-8 gap-1.5 text-caption-2-medium shadow-2xs"
                title={t("pages.knowledge.searchMatchingFile")}
              >
                <RiSearchLine className="size-3.5 text-accent-500" />
                <span>{t("pages.knowledge.searchInFile")}</span>
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 gap-1 px-2.5 text-caption-2-medium text-text-secondary hover:text-text-primary"
              title={t("pages.knowledge.copyFileText")}
            >
              {copied ? (
                <RiCheckLine className="size-3.5 text-state-success-text" />
              ) : (
                <RiClipboardLine className="size-3.5" />
              )}
              <span>{copied ? t("pages.knowledge.copied") : t("pages.knowledge.copyFileText")}</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary"
              aria-label={t("pages.knowledge.closePanel")}
            >
              <RiCloseLine className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-background-secondary-default/30 p-6 select-text [scrollbar-width:thin]">
          {fileContentQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-tertiary gap-2">
              <RiLoader4Line className="size-6 animate-spin text-accent-500" />
              <span className="text-caption-1-medium">{t("pages.knowledge.loadingDocument")}</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-separator-border/60 bg-background-primary-default p-4 shadow-2xs overflow-x-auto">
              <table className="w-full border-collapse font-mono text-caption-2-regular leading-relaxed">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-background-secondary-hover/40 group">
                      <td className="w-12 select-none pr-4 text-right text-caption-2-regular text-text-tertiary/50 font-mono">
                        {idx + 1}
                      </td>
                      <td className="whitespace-pre text-text-primary/90">
                        {line || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-separator-border/60 bg-background-primary-default px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-2 text-caption-2-regular text-text-tertiary font-mono">
            <RiFileTextLine className="size-3.5 text-accent-500" />
            <span>{document.sourcePath === "." ? t("pages.knowledge.workspaceRoot") : document.sourcePath}</span>
          </div>
          <Button size="sm" variant="outline" onClick={onClose} className="h-7.5 px-3 text-caption-2-medium">
            {t("pages.knowledge.doneCollapse")}
          </Button>
        </footer>
      </aside>
    </div>
  )
}
