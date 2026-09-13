/**
 * devl.dev 风格提交节点行组件：
 * 对齐 https://www.devl.dev/c/timelines/commits 中的单行提交项：
 * - 作者彩色字母头像 (MO, JL, RP, SB)
 * - Conventional Commit 规范语法智能高亮 (feat, fix, refactor 等)
 * - 分支/版本 Tag 徽标 (v3.4, main)
 * - 完备的元信息行 (作者 · 作用域 · 相对时间 · N 文件 +N -M)
 * - 交互式短 SHA 复制按钮及反馈
 */

import { useState } from "react"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiGitMergeLine,
  RiPriceTag3Line
} from "@remixicon/react"
import type { CommitListItem } from "../types/review.types"
import { AUTHOR_COLOR_PALETTES } from "../constants/review-constants"

export function CommitRow(props: {
  commit: CommitListItem
  isHead?: boolean
  branch?: string
  onSelect?: (hash: string) => void
}) {
  const { commit, isHead, branch, onSelect } = props
  const [copied, setCopied] = useState(false)

  // 根据作者名称生成确定性色彩
  const paletteIndex =
    Math.abs(
      commit.authorName
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % AUTHOR_COLOR_PALETTES.length
  const avatarClass = AUTHOR_COLOR_PALETTES[paletteIndex]

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    void navigator.clipboard.writeText(commit.hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 解析 Conventional Commit (例如: "feat(audit): ...")
  const conventionalMatch = commit.message.match(/^([a-z]+)(\([a-z0-9_-]+\))?:\s*(.*)$/i)
  const prefixType = conventionalMatch ? conventionalMatch[1] : null
  const prefixScope = conventionalMatch ? conventionalMatch[2] : null
  const messageBody = conventionalMatch ? conventionalMatch[3] : commit.message

  return (
    <div
      onClick={() => onSelect?.(commit.hash)}
      className="group relative flex h-16 items-center justify-between gap-3 pl-14 pr-3 hover:bg-background-secondary-hover/60 cursor-pointer select-none transition-colors border-b border-separator-border/30"
    >
      {/* 提交正文与作者微标 */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* 作者彩色圆形头像 */}
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] font-bold border ${avatarClass}`}
        >
          {commit.authorInitials}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* 主标题行 */}
          <div className="flex items-center gap-1.5 font-sans text-caption-1-medium text-text-primary">
            {commit.isMerge ? (
              <RiGitMergeLine className="size-3.5 shrink-0 text-text-tertiary" />
            ) : null}

            {prefixType ? (
              <span className="shrink-0 font-semibold text-accent-500">
                {prefixType}
                {prefixScope ? (
                  <span className="text-text-secondary">{prefixScope}</span>
                ) : null}
                :
              </span>
            ) : null}

            <span className="truncate text-text-primary group-hover:text-accent-500 transition-colors">
              {messageBody}
            </span>

            {/* Head 分支或 Tag 徽标 */}
            {isHead && branch ? (
              <span className="inline-flex max-w-[110px] shrink-0 truncate items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.2 font-mono text-[10.5px] font-medium text-accent-500" title={branch}>
                {branch}
              </span>
            ) : null}

            {commit.tags?.map((tag) => (
              <span
                key={tag}
                title={tag}
                className="inline-flex max-w-[110px] shrink-0 truncate items-center gap-0.5 rounded bg-background-secondary-default px-1.5 py-0.2 font-mono text-[10px] text-text-secondary border border-separator-border/60"
              >
                <RiPriceTag3Line className="size-2.5 shrink-0" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
          </div>

          {/* 副标题：作者 · 作用域 · 相对时间 · N 文件 +N -M */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-tertiary">
            <span className="max-w-[110px] truncate" title={commit.authorName}>{commit.authorName}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">{commit.relativeTime}</span>
            {commit.filesChanged > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{commit.filesChanged} 文件</span>
                <span className="text-state-success-text">+{commit.additions}</span>
                <span className="text-text-error-primary">-{commit.deletions}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* 右侧 Short SHA 胶囊 */}
      <button
        type="button"
        onClick={handleCopy}
        title="复制完整 Commit SHA"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-separator-border/60 bg-background-secondary-default/50 px-2 py-1 font-mono text-[11px] text-text-tertiary hover:border-separator-border hover:bg-background-secondary-hover hover:text-text-primary transition-all"
      >
        {copied ? (
          <RiCheckLine className="size-3 text-state-success-text" />
        ) : (
          <RiFileCopyLine className="size-3 opacity-70" />
        )}
        <span>{commit.shortHash}</span>
      </button>
    </div>
  )
}
