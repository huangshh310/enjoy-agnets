/**
 * 审查栏：按作用域切检查点 / 提交 / 未提交 diff。
 */
import {
  ReviewChangesPane,
  ReviewCheckpointsPane,
  ReviewCommitsPane
} from "./review/review-scope-panes"
import type { ReviewViewProps } from "./review/review-view-props"
import { useReviewViewModel } from "./review/use-review-view-model"

export function ReviewView(props: ReviewViewProps) {
  const vm = useReviewViewModel(props)
  if (vm.scope === "checkpoints") return <ReviewCheckpointsPane vm={vm} />
  if (vm.scope === "commits") return <ReviewCommitsPane vm={vm} />
  return <ReviewChangesPane vm={vm} />
}
