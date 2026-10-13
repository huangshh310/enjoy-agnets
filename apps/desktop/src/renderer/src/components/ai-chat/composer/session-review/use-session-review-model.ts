/**
 * 改动条 / 独立预览条的可见性与可开目标。
 */
import { useEffect, useMemo, useRef } from "react"
import { pathsFromLastTurn, unconfirmedPathsFromLastTurn } from "@renderer/components/ai-chat/right-pane/views/review/last-turn-paths"
import { isRestoreFamilyCode } from "@enjoy-agents/ipc-contract/restore-codes"
import { classifyThreadError } from "@renderer/lib/usage/classify-thread-error"
import { useChatStore } from "@renderer/stores/chat-store"
import { describeReviewFiles } from "./collect-session-files"
import {
  collectLastTurnPreviewUrl,
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
  const changesLoadedAt = useChatStore((state) => state.changesLoadedAt)
  // 本轮结束（或本视图挂上）的时刻：git 改动表要比它新，才算「git 确认」。
  const turnEndedAt = useRef(Date.now())
  const wasRunning = useRef(running)
  useEffect(() => {
    if (wasRunning.current && !running) turnEndedAt.current = Date.now()
    wasRunning.current = running
  }, [running])
  const error = useChatStore((state) => state.error)
  const dismissedKey = useChatStore((state) => state.sessionReviewDismissedKey)
  const sessionId = useChatStore((state) => state.sessionId)
  const repositories = useChatStore((state) => state.repositories)
  const workflowStatus = repositories.find((node) => node.id === sessionId)?.workflowStatus
  const needsReview = workflowStatus === "needs_review"
  const approved = workflowStatus === "done"

  // jojo：强杀 / 停止 / 重启回挂的轮只认真落盘的文件（见 describeReviewFiles）。
  const interrupted =
    !running &&
    (isRestoreFamilyCode(notice) ||
      classifyThreadError(notice ?? "") === "stopped" ||
      classifyThreadError(error ?? "") === "stopped")
  const pick = useMemo(
    () =>
      describeReviewFiles(pathsFromLastTurn(messages), changes, running, gitRepo, {
        interrupted,
        unconfirmed: unconfirmedPathsFromLastTurn(messages),
        changesFresh: changesLoadedAt >= turnEndedAt.current
      }),
    [messages, changes, running, gitRepo, interrupted, changesLoadedAt]
  )
  const files = pick.files
  const filesKey = useMemo(() => reviewFilesKey(files.map((file) => file.path)), [files])
  const sessionUrl = useMemo(() => collectLastTurnPreviewUrl(messages), [messages])
  // 「在浏览器打开」只看这一轮改动条目自己的路径：「文件」里点过的 .html 不再串进 .txt 的待验收条（luna 3cf0）。
  const previewTarget = useMemo(() => pickPreviewTarget({ files, sessionUrl }), [files, sessionUrl])
  const slimTarget = useMemo(() => pickStandalonePreviewTarget({ sessionUrl }), [sessionUrl])
  const showReview = sessionReviewVisible(
    files.length,
    running,
    dismissedKey,
    filesKey,
    messages.length,
    needsReview,
    approved
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
