import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiLoader4Line,
  RiSearchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import type { KnowledgeDocumentItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

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
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [copied, setCopied] = useState(false)

  // Query file text content
  const fileContentQuery = useQuery({
    queryKey: ["workspace-file-content", workspaceId, document?.path],
    enabled: hasIde() && Boolean(workspaceId) && Boolean(document?.path) && isOpen,
    queryFn: async () => {
      if (!workspaceId || !document?.path) return ""
      try {
        return (await getIde().workspace.readFile({
          workspaceId,
          path: document.path
        })) as string
      } catch (err) {
        return `// Error reading file: ${String(err)}`
      }
    }
  })

  if (!document) return null

  const content = fileContentQuery.data ?? ""
  const lines = content.split("\n")
  const ext = document.path.split(".").pop()?.toUpperCase() ?? "FILE"

  function handleCopy() {
    void navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-separator-border/60">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 font-mono text-[10px] font-bold shrink-0 shadow-2xs">
                {ext}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-body-medium font-semibold text-text-primary truncate">
                  {document.path}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-text-secondary flex items-center gap-2 mt-0.5 font-mono">
                  <span>{document.chunkCount} vector chunks</span>
                  <span>·</span>
                  <span>{lines.length} lines</span>
                  <span>·</span>
                  <span>Status: {document.status}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onSearchInFile ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSearchInFile(document.path)
                    onClose()
                  }}
                  className="gap-1.5 h-8 text-[11px] shadow-xs"
                  title="Search queries matching this file"
                >
                  <RiSearchLine className="size-3.5 text-accent-500" />
                  <span>Search In File</span>
                </Button>
              ) : null}

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleCopy}
                className="size-8"
                title="Copy file text"
              >
                {copied ? (
                  <RiCheckLine className="size-4 text-emerald-500" />
                ) : (
                  <RiClipboardLine className="size-4 text-text-secondary" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-background-secondary-default/50 font-mono text-[11.5px] leading-relaxed select-text">
          {fileContentQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
              <RiLoader4Line className="size-6 animate-spin text-accent-500" />
              <span className="mt-2 text-[12px]">Loading document text...</span>
            </div>
          ) : (
            <div className="rounded-xl border border-separator-border/60 bg-background-primary-default p-4 shadow-2xs overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-background-secondary-hover/40 group">
                      <td className="w-10 select-none pr-4 text-right text-[10px] text-text-tertiary/60 font-mono">
                        {idx + 1}
                      </td>
                      <td className="whitespace-pre font-mono text-text-primary/90">
                        {line || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
