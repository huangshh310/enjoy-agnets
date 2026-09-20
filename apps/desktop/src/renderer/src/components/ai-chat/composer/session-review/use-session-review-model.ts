/**
 * 改动条 / 独立预览条的可见性与可开目标。
 */
import { useMemo } from "react"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { useChatStore } from "@renderer/stores/chat-store"
import { describeReviewFiles } from "./collect-session-files"
import {
  collectSessionPreviewUrl,
  pickPreviewTarget,
  pickStandalonePreviewTarget
} from "./preview-open/pick-preview-target"
import { reviewFilesKey, sessionReviewVisible } from "./session-review-visible"

export function useSessionReviewModel() {
  const messages = useChatStore((state) => state.messages)
  const changes = useChatStore((state) => state.changes)
  const running = useChatStore((state) => state.running)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const dismissedKey = useChatStore((state) => state.sessionReviewDismissedKey)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const needsReview =
    repositories.find((node) => node.id === sessionId)?.workflowStatus === "needs_review"

  const pick = useMemo(
    () => describeReviewFiles(pathsFromLastTurn(messages), changes, running),
    [messages, changes, running]
  )
  const files = pick.files
  const filesKey = useMemo(() => reviewFilesKey(files.map((file) => file.path)), [files])
  const sessionUrl = useMemo(() => collectSessionPreviewUrl(messages), [messages])
  const previewTarget = useMemo(
    () => pickPreviewTarget({ selectedPath: selectedFilePath, files, sessionUrl }),
    [selectedFilePath, files, sessionUrl]
  )
  const slimTarget = useMemo(
    () => pickStandalonePreviewTarget({ selectedPath: selectedFilePath, sessionUrl }),
    [selectedFilePath, sessionUrl]
  )
  const showReview = sessionReviewVisible(
    files.length,
    running,
    dismissedKey,
    filesKey,
    messages.length,
    needsReview
  )
  return {
    pick,
    files,
    filesKey,
    previewTarget,
    slimTarget,
    showReview,
    needsReview,
    showSlim: !showReview && messages.length > 0 && slimTarget != null
  }
}
