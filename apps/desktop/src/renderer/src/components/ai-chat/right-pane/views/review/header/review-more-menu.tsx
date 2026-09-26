/**
 * 审查栏更多操作菜单组件：
 * 对齐 Codex Image #2 的“...”下拉菜单，提供刷新、自动换行、隐藏空白、文字差异与 Git apply 复制等高阶操作。
 */

import { useState } from "react"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiFontSize,
  RiMoreFill,
  RiRefreshLine,
  RiSparklingLine,
  RiSpace,
  RiTerminalBoxLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import type { ReviewOptions } from "../types/review.types"

export function ReviewMoreMenu(props: {
  options: ReviewOptions
  onToggleOption: (key: keyof ReviewOptions) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onCopyApplyCmd?: () => void
  onCopyUnifiedDiff?: () => void
}) {
  const {
    options,
    onToggleOption,
    onRefresh,
    isRefreshing,
    onCopyApplyCmd,
    onCopyUnifiedDiff
  } = props
  const t = useT()
  const [copiedApply, setCopiedApply] = useState(false)
  const [copiedDiff, setCopiedDiff] = useState(false)

  function handleCopyApply() {
    onCopyApplyCmd?.()
    setCopiedApply(true)
    setTimeout(() => setCopiedApply(false), 1500)
  }

  function handleCopyDiff() {
    onCopyUnifiedDiff?.()
    setCopiedDiff(true)
    setTimeout(() => setCopiedDiff(false), 1500)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={t("chat.previewRailLabel")}
          className="cursor-pointer rounded-md p-1.5 text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
        >
          <RiMoreFill className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1">
        {onRefresh ? (
          <>
            <DropdownMenuItem
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer"
            >
              <RiRefreshLine className={`size-4 ${isRefreshing ? "animate-spin text-accent-500" : ""}`} />
              <span>{t("chat.reviewRefreshHistory")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem
          onClick={() => onToggleOption("wordWrap")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFontSize className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewToggleWordWrap")}</span>
          </div>
          {options.wordWrap ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("foldLargeFiles")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFileTextLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewFoldLargeFiles")}</span>
          </div>
          {options.foldLargeFiles ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("richPreview")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiSparklingLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewRichPreview")}</span>
          </div>
          {options.richPreview ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("wordDiff")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFontSize className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewWordDiff")}</span>
          </div>
          {options.wordDiff ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onToggleOption("hideWhitespace")}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiSpace className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewHideWhitespace")}</span>
          </div>
          {options.hideWhitespace ? <RiCheckLine className="size-4 text-accent-500" /> : null}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleCopyApply}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiTerminalBoxLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewCopyGitApply")}</span>
          </div>
          {copiedApply ? <span className="text-caption-2-regular text-state-success-text">{t("chat.reviewCopied")}</span> : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCopyDiff}
          className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RiFileCopyLine className="size-4 text-text-tertiary" />
            <span>{t("chat.reviewCopyUnifiedDiff")}</span>
          </div>
          {copiedDiff ? <span className="text-caption-2-regular text-state-success-text">{t("chat.reviewCopied")}</span> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
