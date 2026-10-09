/**
 * 助手消息中的 Git 提交结构化卡片：
 * 取代对话框里平铺几十行纯文本终端日志，提供一键在右侧审查栏 (Review Commits) 查看 Diff 的入口。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiGitBranchLine,
  RiGitCommitLine,
  RiExternalLinkLine
} from "@remixicon/react"
import { openReviewCommits } from "../right-pane/open-pane"
import { useT } from "@renderer/i18n"

export interface GitCommitInfo {
  hash: string
  message: string
  branch?: string
  remote?: string
}

export function GitCommitCard({ info }: { info: GitCommitInfo }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const shortHash = info.hash.length > 7 ? info.hash.slice(0, 7) : info.hash

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(info.hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleJumpReview() {
    openReviewCommits()
  }

  // 解析常规提交 (feat, fix, etc.)
  const conventionalMatch = info.message.match(/^([a-z]+)(\([a-z0-9_-]+\))?:\s*(.*)$/i)
  const prefixType = conventionalMatch ? conventionalMatch[1] : null
  const prefixScope = conventionalMatch ? conventionalMatch[2] : null
  const messageBody = conventionalMatch ? conventionalMatch[3] : info.message

  return (
    <div
      data-testid="git-commit-card"
      className="my-2 flex flex-col gap-2 rounded-xl border border-border-button-default bg-background-secondary-default/60 p-3 shadow-2xs select-none transition-all hover:border-accent-500/40"
    >
      {/* 顶栏：Git 提交标签 + 分支 + SHA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-500/12 text-accent-500">
            <RiGitCommitLine className="size-3.5" />
          </span>
          <span className="text-caption-2-medium font-semibold text-text-primary">
            {t("chat.gitCommitCardTitle")}
          </span>
          {info.branch ? (
            <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.2 font-mono text-caption-2-medium font-medium text-accent-500">
              <RiGitBranchLine className="size-2.5" />
              <span>{info.branch}</span>
            </span>
          ) : null}
          {info.remote ? (
            <span className="text-caption-2-regular text-text-tertiary">
              → {info.remote}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          title={t("chat.reviewCopySha")}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-separator-border/60 bg-background-primary-default px-1.5 py-0.5 font-mono text-caption-2-medium text-text-tertiary hover:text-text-primary transition-colors"
        >
          {copied ? (
            <RiCheckLine className="size-3 text-state-success-text" />
          ) : (
            <RiFileCopyLine className="size-3 opacity-70" />
          )}
          <span>{shortHash}</span>
        </button>
      </div>

      {/* 提交标题 */}
      <div className="min-w-0 text-caption-1-medium text-text-primary">
        {prefixType ? (
          <span className="font-semibold text-accent-500">
            {prefixType}
            {prefixScope ? <span className="text-text-secondary">{prefixScope}</span> : null}
            :&nbsp;
          </span>
        ) : null}
        <span>{messageBody}</span>
      </div>

      {/* 底部动作：直跳右侧审查栏 */}
      <div className="mt-1 flex items-center justify-end border-t border-separator-border/40 pt-2">
        <button
          type="button"
          onClick={handleJumpReview}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500/10 px-2.5 py-1 text-caption-2-medium font-medium text-accent-500 hover:bg-accent-500/20 active:bg-accent-500/25 transition-colors"
        >
          <RiExternalLinkLine className="size-3.5" />
          <span>{t("chat.gitCommitReviewDiff")}</span>
        </button>
      </div>
    </div>
  )
}
