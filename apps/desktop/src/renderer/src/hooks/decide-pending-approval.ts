/**
 * 审批点允许：回挂 reattach 前安静 return，其它失败走人话。
 */
import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"
import { APPROVAL_NOT_REATTACHED, extractApprovalDecideCode } from "@enjoy-agents/ipc-contract/approval-decide"
import { getIde } from "../lib/ide"
import { queryClient } from "../lib/query-client"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { useChatStore } from "../stores/chat-store"
import { approvalDecideUiError } from "./approval-decide-failure"
import { resolveApprovalRunId } from "./resolve-approval-run"

export async function decidePendingApproval(
  decision: "allow" | "deny" | "allow_session" | "allow_always",
  answers?: AskUserAnswers
) {
  try {
    await decidePendingApprovalOrThrow(decision, answers)
  } catch (error) {
    const store = useChatStore.getState()
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

/** Dock 与「拒绝并归档」同一条 decide；归档路径要抛错，不能吞。 */
export async function decidePendingApprovalOrThrow(
  decision: "allow" | "deny" | "allow_session" | "allow_always",
  answers?: AskUserAnswers
) {
  const store = useChatStore.getState()
  const pending = store.pendingApproval
  const runId = resolveApprovalRunId(pending, store.runId)
  if (!pending || !runId) throw new Error("没有等待中的审批。")
  try {
    await getIde().agent.decide({
      runId,
      toolCallId: pending.toolCallId,
      approvalId: pending.approvalId,
      decision,
      ...(answers ? { answers } : {})
    })
  } catch (error) {
    const shown = approvalDecideUiError(error)
    if (shown) throw new Error(translateDecideError(shown))
    if (extractApprovalDecideCode(error) === APPROVAL_NOT_REATTACHED) return
    throw error
  }
}

function translateDecideError(path: string): string {
  const language = (
    queryClient.getQueryData(["settings"]) as
      | { preferences?: { language?: LanguagePref } }
      | undefined
  )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  return translate(messages, path)
}
