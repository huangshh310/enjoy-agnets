/**
 * 审查栏：按作用域切检查点 / 提交 / 未提交 diff。
 * 非 git 直接出空态，不要再挂 diff / 自动选文件，避免 setState 环。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import {
  ReviewChangesPane,
  ReviewCheckpointsPane,
  ReviewCommitsPane
} from "./review/review-scope-panes"
import { ReviewNotGitEmpty } from "./review/review-not-git-empty"
import type { ReviewViewProps } from "./review/review-view-props"
import { useReviewViewModel } from "./review/use-review-view-model"

export function ReviewView(props: ReviewViewProps) {
  const vm = useReviewViewModel(props)
  const gitRepo = useChatStore((state) => state.gitRepo)
  if (gitRepo === false) return <ReviewNotGitEmpty />
  if (vm.scope === "checkpoints") return <ReviewCheckpointsPane vm={vm} />
  if (vm.scope === "commits") return <ReviewCommitsPane vm={vm} />
  return <ReviewChangesPane vm={vm} />
}
