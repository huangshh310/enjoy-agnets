/**
 * Commits timeline 节点行：左轨圆点 + 作者微标 + 说明 + SHA。
 */
import { useState } from "react"
import { RiCheckLine, RiFileCopyLine, RiGitMergeLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { CommitListItem } from "./review.types"

export function CommitRow(props: {
  commit: CommitListItem
  isHead?: boolean
  branch?: string
  onSelect?: (hash: string) => void
}) {
  const { commit, isHead, branch, onSelect } = props
  const t = useT()
  const [copied, setCopied] = useState(false)

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    void navigator.clipboard.writeText(commit.hash)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      onClick={() => onSelect?.(commit.hash)}
      className={cx(
        "group relative flex items-start gap-2.5 py-2 pr-2 pl-0",
        onSelect ? "cursor-pointer" : "cursor-default"
      )}
    >
      <span className="relative z-[1] mt-1.5 flex w-8 shrink-0 justify-center" aria-hidden>
        <span
          className={cx(
            "size-2.5 rounded-full bg-background-primary-default",
            commit.isMerge && "border-2 border-accent-500",
            !commit.isMerge && isHead && "bg-accent-500 ring-4 ring-accent-500/15",
            !commit.isMerge && !isHead && "bg-accent-500/70"
          )}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-1.5 py-0.5 group-hover:bg-background-secondary-hover/80">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-500/12 font-mono text-caption-2-medium text-accent-500">
            {commit.authorInitials}
          </span>
          {commit.isMerge ? (
            <RiGitMergeLine className="size-3 shrink-0 text-text-tertiary" />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary group-hover:text-accent-500">
            {commit.message}
          </span>
          {isHead && branch ? (
            <span className="shrink-0 rounded bg-accent-500/10 px-1.5 py-0.5 font-mono text-caption-2-medium text-accent-500">
              {branch}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            title={t("chat.reviewCopySha")}
            className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 py-0.5 font-mono text-caption-2-medium text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary"
          >
            {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiFileCopyLine className="size-3" />}
            <span>{commit.shortHash}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 pl-6 font-mono text-caption-2-medium text-text-tertiary">
          <span>{commit.authorName}</span>
          <span aria-hidden>·</span>
          <span>{commit.relativeTime}</span>
          {commit.filesChanged > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("chat.reviewFilesCount", { n: commit.filesChanged })}</span>
              <span className="text-state-success-text">+{commit.additions}</span>
              <span className="text-text-error-primary">-{commit.deletions}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
