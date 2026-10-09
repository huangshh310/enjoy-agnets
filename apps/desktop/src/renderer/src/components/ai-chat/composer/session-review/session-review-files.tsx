/**
 * 改动条文件行：彩色类型标 + 文件名 + 目录 + 增减。
 */
import { FileTypeIcon } from "@renderer/components/ai-chat/file-type-icon"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import type { SessionReviewFile } from "./session-review.types"

export function SessionFileTrigger({
  file,
  title,
  onOpen
}: {
  file: SessionReviewFile
  title: string
  onOpen: (path: string) => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={() => onOpen(file.path)}
      className="group flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left text-text-secondary transition-colors hover:text-text-primary"
    >
      <FileTypeIcon name={file.name} kind={file.kind} size={15} />
      <span className="truncate font-mono text-caption-1-medium tracking-tight text-text-primary/90 group-hover:text-accent-500">
        {file.name}
      </span>
      {file.dir ? (
        <span className="max-w-[160px] truncate font-mono text-caption-2-regular text-text-tertiary/70">{file.dir}</span>
      ) : null}
      <DiffCounts additions={file.additions} deletions={file.deletions} />
    </button>
  )
}

export function SessionFileRow({
  file,
  onOpen
}: {
  file: SessionReviewFile
  onOpen: (path: string) => void
}) {
  return (
    <button
      type="button"
      title={file.path}
      onClick={() => onOpen(file.path)}
      className="group flex h-7.5 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-text-primary/80 transition-all hover:bg-background-primary-default/90 hover:text-text-primary"
    >
      <FileTypeIcon name={file.name} kind={file.kind} size={15} />
      <span className="min-w-0 truncate font-mono text-caption-1-medium text-text-primary group-hover:text-accent-500">
        {file.name}
      </span>
      {file.dir ? (
        <span className="max-w-[200px] truncate font-mono text-caption-2-regular text-text-tertiary/70">{file.dir}</span>
      ) : null}
      <span className="ml-auto shrink-0">
        <DiffCounts additions={file.additions} deletions={file.deletions} />
      </span>
    </button>
  )
}

function DiffCounts({ additions, deletions }: { additions: number; deletions: number }) {
  const t = useT()
  if (additions <= 0 && deletions <= 0) {
    return (
      <span className="shrink-0 text-caption-2-medium text-status-yellow-text">{t("chat.sessionReviewNoDiff")}</span>
    )
  }
  return (
    <span className="shrink-0 font-mono text-caption-2-semibold tabular-nums">
      {additions > 0 ? <span className="text-state-success-text">+{additions}</span> : null}
      {additions > 0 && deletions > 0 ? " " : null}
      {deletions > 0 ? <span className="text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}

export function sessionFileListClassName(expanded: boolean): string {
  return cx(
    "mt-1.5 max-h-48 space-y-0.5 overflow-y-auto border-t border-border-button-default/40 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    !expanded && "hidden"
  )
}
