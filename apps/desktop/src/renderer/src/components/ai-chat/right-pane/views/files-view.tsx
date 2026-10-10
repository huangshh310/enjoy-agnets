/**
 * 文件视图：左侧可拖拽改宽的目录树 + 右侧预览。
 * 知识库 / 只读来源带 reveal.view=preview 时走只读「查看文件」，不进审查栏。
 */
import { useEffect, useState } from "react"
import { RiFolder3Line } from "@remixicon/react"
import { remapAfterMove } from "@enjoy-agents/ipc-contract"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { getIde } from "@renderer/lib/ide"
import { SourceFilePreview } from "../../source-file-preview"
import { useSourceFileReveal } from "../../thread/sources/source-file-reveal"
import { sameReviewPath } from "./review/same-review-path"
import { FilesPreviewEditor } from "./files-preview-editor"
import { FilesSplit } from "./files-split"
import { FilesTree } from "./files-tree"
import { moveFailureCopy } from "./files-move-error"
import { useT } from "@renderer/i18n"

const MAX_PREVIEW_CHARS = 200_000

export function FilesView({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
  const reveal = useSourceFileReveal((state) => state.reveal)
  const [path, setPath] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [treeOpen, setTreeOpen] = useState(true)
  const [treeEpoch, setTreeEpoch] = useState(0)
  const readOnly = reveal?.view === "preview" && path != null && sameReviewPath(reveal.path, path)

  useEffect(() => {
    if (!workspaceId) return
    // 工作区级已在 useWorkspaceChangeInvalidation watch；这里幂等重订，只刷新树。
    void getIde().workspace.watch({ workspaceId })
    const unsubscribe = getIde().workspace.onChanged((event) => {
      if (event.workspaceId !== workspaceId) return
      setTreeEpoch((value) => value + 1)
    })
    return () => {
      unsubscribe()
    }
  }, [workspaceId])

  async function moveEntry(from: string, toDir: string) {
    if (!workspaceId) return
    setMoveError(null)
    try {
      const result = (await getIde().workspace.move({ workspaceId, from, toDir })) as {
        to: string
      }
      setPath((current) => (current ? remapAfterMove(current, from, result.to) : current))
      setTreeEpoch((value) => value + 1)
    } catch (caught) {
      setMoveError(moveFailureCopy(caught, t))
    }
  }

  async function openFile(nextPath: string) {
    if (!workspaceId) return
    setPath(nextPath)
    setError(null)
    setMoveError(null)
    try {
      const text = (await getIde().workspace.readFile({ workspaceId, path: nextPath })) as string
      setContent(text.length > MAX_PREVIEW_CHARS ? `${text.slice(0, MAX_PREVIEW_CHARS)}\n…` : text)
    } catch (caught) {
      setContent("")
      setError(caught instanceof Error ? caught.message : t("chat.couldNotRead"))
    }
  }

  useEffect(() => {
    if (reveal?.view !== "preview" || !reveal.path || !workspaceId) return
    void openFile(reveal.path)
  }, [reveal?.path, reveal?.view, workspaceId])

  const preview =
    workspaceId && readOnly && path ? (
      <SourceFilePreview path={path} content={content} />
    ) : workspaceId ? (
      <FilesPreviewEditor workspaceId={workspaceId} path={path} content={content} error={error} />
    ) : (
    <p className="flex h-full items-center justify-center px-3 text-center text-caption-1-medium text-text-tertiary">
      {t("chat.openFolderFirst")}
    </p>
  )
  const tree = workspaceId ? (
    <FilesTree
      key={`${workspaceId}-${treeEpoch}`}
      workspaceId={workspaceId}
      selectedPath={path}
      onSelectFile={(next) => void openFile(next)}
      onMove={(from, toDir) => void moveEntry(from, toDir)}
    />
  ) : (
    <p className="flex h-full items-center justify-center px-3 text-center text-caption-1-medium text-text-tertiary">
      {t("chat.openFolderFirst")}
    </p>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-separator-border px-2">
        <QuietIconButton
          icon={RiFolder3Line}
          aria-label={treeOpen ? t("chat.hideTree") : t("chat.showTree")}
          title={treeOpen ? t("chat.hideTree") : t("chat.showTree")}
          aria-pressed={treeOpen}
          onClick={() => setTreeOpen((open) => !open)}
          className={treeOpen ? "bg-background-secondary-default text-text-primary" : undefined}
        />
        <p
          className={`min-w-0 flex-1 truncate font-mono text-caption-1-medium ${
            moveError ? "text-text-error-primary" : "text-text-tertiary"
          }`}
        >
          {moveError ?? path ?? t("chat.openAFile")}
        </p>
      </div>
      {treeOpen ? <FilesSplit tree={tree}>{preview}</FilesSplit> : preview}
    </div>
  )
}
