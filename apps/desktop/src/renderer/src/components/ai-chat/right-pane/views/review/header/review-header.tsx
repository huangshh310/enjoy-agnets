/**
 * 审查栏顶层主控制标头组件：
 * 对齐 Codex Image #1 & #6 视觉规范。
 * 第一行：作用域下拉、全局差异徽标 (+1,988 -162)、操作工具条（更多、展开全部、跳转文件、布局模式、文件树显隐、提交或推送下拉）。
 * 第二行：分支对比行 (main → origin/main ▾)。
 */

import {
  RiArrowDownSLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiCollapseDiagonalLine,
  RiExpandDiagonalLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiGitCommitLine,
  RiSearchLine,
  RiUploadCloudLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import type { DiffPalette } from "../../../../diff/diff-palette"
import type { ReviewOptions, ReviewScope } from "../types/review.types"
import { ReviewScopeDropdown } from "./review-scope-dropdown"
import { ReviewMoreMenu } from "./review-more-menu"

export function ReviewHeader(props: {
  scope: ReviewScope
  onSelectScope: (scope: ReviewScope) => void
  currentBranch: string
  baseBranch?: string
  additions: number
  deletions: number
  options: ReviewOptions
  palette: DiffPalette
  onPalette: (palette: DiffPalette) => void
  onToggleOption: (key: keyof ReviewOptions) => void
  allExpanded: boolean
  onToggleAllExpanded: () => void
  onOpenJumpPalette: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onCopyApplyCmd?: () => void
  onCopyUnifiedDiff?: () => void
  onPrimaryCommit?: () => void
  onPrimaryPush?: () => void
  showCommitPush?: boolean
}) {
  const {
    scope,
    onSelectScope,
    currentBranch,
    baseBranch = "",
    additions,
    deletions,
    options,
    palette,
    onPalette,
    onToggleOption,
    allExpanded,
    onToggleAllExpanded,
    onOpenJumpPalette,
    onRefresh,
    isRefreshing,
    onCopyApplyCmd,
    onCopyUnifiedDiff,
    onPrimaryCommit,
    onPrimaryPush,
    showCommitPush = true
  } = props
  const t = useT()

  const branchLabel = currentBranch || t("chat.reviewDetached")

  return (
    <header className="flex shrink-0 flex-col border-b border-separator-border bg-background-primary-default select-none">
      {/* 第一行主工具条 */}
      <div className="flex min-h-11 min-w-0 items-center justify-between gap-2 px-3">
        {/* 左侧：作用域下拉 + 全局增减行统计徽标 */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <ReviewScopeDropdown scope={scope} onSelectScope={onSelectScope} />

          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background-secondary-default px-2 py-0.5 font-mono text-caption-2-semibold font-semibold">
            <span className="text-state-success-text">+{additions.toLocaleString()}</span>
            <span className="text-text-error-primary">-{deletions.toLocaleString()}</span>
          </div>
        </div>

        {/* 右侧：操作按钮群 */}
        <div className="flex min-w-0 shrink items-center justify-end gap-1 text-text-secondary">
          <ReviewMoreMenu
            options={options}
            palette={palette}
            onPalette={onPalette}
            onToggleOption={onToggleOption}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onCopyApplyCmd={onCopyApplyCmd}
            onCopyUnifiedDiff={onCopyUnifiedDiff}
          />
          <div className="hidden min-[1280px]:flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenJumpPalette}
              title={t("chat.reviewJumpToFile")}
              className="cursor-pointer rounded-md p-1.5 hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
            >
              <RiSearchLine className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleOption("fileTreeVisible")}
              title={t("chat.reviewToggleFileTree")}
              className={`cursor-pointer rounded-md p-1.5 transition-colors ${
                options.fileTreeVisible
                  ? "bg-accent-500/10 text-accent-500"
                  : "hover:bg-background-secondary-hover hover:text-text-primary"
              }`}
            >
              <RiFolder6Line className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleAllExpanded}
            title={allExpanded ? t("chat.reviewCollapseAllDiffs") : t("chat.reviewExpandAllDiffs")}
            className="shrink-0 cursor-pointer rounded-md p-1.5 hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
          >
            {allExpanded ? (
              <RiCollapseDiagonalLine className="size-4" />
            ) : (
              <RiExpandDiagonalLine className="size-4" />
            )}
          </button>

          {showCommitPush ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-button-primary px-3 py-1 text-caption-2-medium font-semibold text-text-white shadow-xs hover:bg-button-primary/90 active:scale-98 cursor-pointer transition-all"
              >
                <RiGitCommitLine className="size-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t("chat.reviewCommitOrPush")}</span>
                <RiArrowDownSLine className="size-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1">
              <DropdownMenuItem
                onClick={onPrimaryCommit}
                className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer"
              >
                <RiCheckDoubleLine className="size-4 text-accent-500" />
                <span>{t("chat.reviewCommitChanges")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onPrimaryPush}
                className="flex items-center gap-2 py-1.5 px-2 text-caption-1-medium cursor-pointer"
              >
                <RiUploadCloudLine className="size-4 text-text-tertiary" />
                <span>{t("chat.reviewCommitAndPush")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* 第二行：分支对比行 (main → origin/main ▾) */}
      <div className="flex h-7 items-center gap-1.5 px-3.5 font-mono text-caption-2-regular text-text-tertiary border-t border-separator-border/40 bg-background-secondary-default/30">
        <RiGitBranchLine className="size-3 text-accent-500 shrink-0" />
        <span className="font-medium text-text-secondary">
          {baseBranch || t("chat.reviewNoUpstream")}
        </span>
        <RiArrowRightLine className="size-3 text-text-tertiary/70 shrink-0" />
        <span className="font-medium text-accent-500">{branchLabel}</span>
        <RiArrowDownSLine className="size-3 text-text-tertiary/60 shrink-0" />
      </div>
    </header>
  )
}
