/**
 * 改动条 / 独立预览条的可见性与可开目标。
 */
import { useMemo } from "react"
import { pathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
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
  const gitRepo = useChatStore((state) => state.gitRepo)
  const running = useChatStore((state) => state.running)
  const notice = useChatStore((state) => state.notice)
  const error = useChatStore((state) => state.error)
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const dismissedKey = useChatStore((state) => state.sessionReviewDismissedKey)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const needsReview =
    repositories.find((node) => node.id === sessionId)?.workflowStatus === "needs_review"

  // jojo：强杀 / 停止 / 重启回挂的轮只认真落盘的文件（见 describeReviewFiles）。
  const interrupted =
    !running &&
    (isRestoreFamilyCode(notice) ||
      classifyThreadError(notice ?? "") === "stopped" ||
      classifyThreadError(error ?? "") === "stopped")
  const pick = useMemo(
    () => describeReviewFiles(pathsFromLastTurn(messages), changes, running, gitRepo, interrupted),
    [messages, changes, running, gitRepo, interrupted]
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
