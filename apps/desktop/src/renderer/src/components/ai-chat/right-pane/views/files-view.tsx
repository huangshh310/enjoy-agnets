/**
 * 文件视图：左侧可拖拽改宽的目录树 + 右侧预览。
 */
import { useState } from "react"
import { RiFolder3Line, RiFolderOpenLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { getIde } from "@renderer/lib/ide"
import { AiChatCodePane } from "../../ai-chat-code-pane"
import { FilesSplit } from "./files-split"
import { FilesTree } from "./files-tree"
import { useT } from "@renderer/i18n"

const MAX_PREVIEW_CHARS = 200_000

export function FilesView({ workspaceId }: { workspaceId: string | null }) {
  const t = useT()
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
      setError(caught instanceof Error ? caught.message : t("chat.couldNotRead"))
    }
  }

  const preview = <FilesPreview path={path} error={error} content={content} />
  const tree = workspaceId ? (
    <FilesTree workspaceId={workspaceId} selectedPath={path} onSelectFile={(next) => void openFile(next)} />
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
        <p className="min-w-0 flex-1 truncate font-mono text-caption-1-medium text-text-tertiary">
          {path ?? t("chat.openAFile")}
        </p>
      </div>
      {treeOpen ? <FilesSplit tree={tree}>{preview}</FilesSplit> : preview}
    </div>
  )
}

function FilesPreview({
  path,
  error,
  content
}: {
  path: string | null
  error: string | null
  content: string
}) {
  const t = useT()
  if (path && error) {
    return <p className="px-3 py-2 text-caption-1-medium text-text-error-primary">{error}</p>
  }
  if (path) {
    return <AiChatCodePane path={path} value={content} />
  }
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <RiFolderOpenLine className="size-10 text-foreground-icon-secondary" aria-hidden />
      <p className="text-body-medium text-text-primary">{t("chat.openAFile")}</p>
      <p className="text-caption-1-medium text-text-tertiary">{t("chat.selectFile")}</p>
    </div>
  )
}
