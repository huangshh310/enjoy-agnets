/**
 * 文件视图：预览 + 可整栏收起的目录树。
 */
import { useState } from "react"
import { RiFolder3Line, RiFolderOpenLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { getIde } from "@renderer/lib/ide"
import { AiChatCodePane } from "../../ai-chat-code-pane"
import { FilesTree } from "./files-tree"

const MAX_PREVIEW_CHARS = 200_000

export function FilesView({ workspaceId }: { workspaceId: string | null }) {
  const [path, setPath] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [treeOpen, setTreeOpen] = useState(true)

  async function openFile(nextPath: string) {
    if (!workspaceId) return
    setPath(nextPath)
    setError(null)
    try {
      const text = (await getIde().workspace.readFile({ workspaceId, path: nextPath })) as string
      setContent(text.length > MAX_PREVIEW_CHARS ? `${text.slice(0, MAX_PREVIEW_CHARS)}\n…` : text)
    } catch (caught) {
      setContent("")
      setError(caught instanceof Error ? caught.message : "Could not read this file.")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-separator-border px-2">
        <p className="min-w-0 flex-1 truncate font-mono text-caption-1-medium text-text-tertiary">
          {path ?? "Open a file"}
        </p>
        <QuietIconButton
          icon={RiFolder3Line}
          aria-label={treeOpen ? "Hide file tree" : "Expand file tree"}
          title={treeOpen ? "收起目录树" : "展开目录树"}
          aria-pressed={treeOpen}
          onClick={() => setTreeOpen((open) => !open)}
          className={treeOpen ? "bg-background-secondary-default text-text-primary" : undefined}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {path ? (
            error ? (
              <p className="px-3 py-2 text-caption-1-medium text-text-error-primary">{error}</p>
            ) : (
              <AiChatCodePane path={path} value={content} />
            )
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <RiFolderOpenLine className="size-10 text-foreground-icon-secondary" aria-hidden />
              <p className="text-body-medium text-text-primary">Open a file</p>
              <p className="text-caption-1-medium text-text-tertiary">
                Select a file from the workspace tree.
              </p>
            </div>
          )}
        </div>
        {workspaceId ? (
          <div hidden={!treeOpen} className="flex h-full min-h-0">
            <FilesTree workspaceId={workspaceId} selectedPath={path} onSelectFile={(next) => void openFile(next)} />
          </div>
        ) : (
          <p className="flex w-[240px] items-center justify-center border-l border-separator-border px-3 text-center text-caption-1-medium text-text-tertiary">
            Open a folder first.
          </p>
        )}
      </div>
    </div>
  )
}
