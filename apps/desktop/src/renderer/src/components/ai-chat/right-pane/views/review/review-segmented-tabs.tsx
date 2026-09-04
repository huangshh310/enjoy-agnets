/**
 * 审查栏分段：变更 / 提交。
 */
import { RiGitBranchLine, RiGitCommitLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ReviewTabMode } from "./review.types"

const TAB_CLASS = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 cursor-pointer"
const TAB_ON = "bg-background-primary-default text-text-primary shadow-2xs"
const TAB_OFF = "text-text-secondary hover:text-text-primary"

export function ReviewSegmentedTabs(props: {
  mode: ReviewTabMode
  changesCount: number
  commitsCount: number
  onChange: (mode: ReviewTabMode) => void
}) {
  const { mode, changesCount, commitsCount, onChange } = props
  const t = useT()
  return (
    <div className="flex items-center gap-1 rounded-xl bg-background-secondary-default/80 p-1 text-caption-2-medium">
      <button
        type="button"
        onClick={() => onChange("changes")}
        className={cx(TAB_CLASS, mode === "changes" ? TAB_ON : TAB_OFF)}
      >
        <RiGitBranchLine className="size-3.5" />
        <span>
          {t("chat.reviewTabChanges")}
          {changesCount > 0 ? ` (${changesCount})` : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("commits")}
        className={cx(TAB_CLASS, mode === "commits" ? TAB_ON : TAB_OFF)}
      >
        <RiGitCommitLine className="size-3.5" />
        <span>
          {t("chat.reviewTabCommits")}
          {commitsCount > 0 ? ` (${commitsCount})` : ""}
        </span>
      </button>
    </div>
  )
}
