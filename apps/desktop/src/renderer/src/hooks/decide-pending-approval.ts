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
import { useAttentionStore } from "../stores/attention/attention-store"
import { useChatStore } from "../stores/chat-store"
import { approvalOtherChatNotice, approvalOtherChatTitle } from "../lib/approval-other-chat"
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
    // 卡属于别的对话：中性灰提示（带那个对话的标题），不是红卡（luna 定稿）。
    if (error instanceof ApprovalInOtherChatError) {
      store.setNotice(approvalOtherChatNotice(error.ownerTitle))
      return
    }
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
  // jojo P1（ACP 导入）：这一轮已知属于别的会话（前台会话切过、卡没跟着走），绝不替那个会话批。
  const owner = useAttentionStore.getState().sessionOfRun(runId)
  // 文案在 chat.approvalBelongsToOtherChat(Titled)，luna 可以改字不动逻辑。
  if (owner && store.sessionId && owner !== store.sessionId) {
    const ownerTitle = store.repositories.find((row) => row.id === owner)?.name ?? null
    const title = approvalOtherChatTitle(ownerTitle)
    throw new ApprovalInOtherChatError(
      owner,
      ownerTitle,
      title
        ? translateDecideError("chat.approvalBelongsToOtherChatTitled", { title })
        : translateDecideError("chat.approvalBelongsToOtherChat")
    )
  }
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

/** 卡属于别的对话时拒批；ownerTitle 是那个对话的原标题（可能为空）。 */
export class ApprovalInOtherChatError extends Error {
  readonly ownerSessionId: string
  readonly ownerTitle: string | null
  constructor(ownerSessionId: string, ownerTitle: string | null, message: string) {
    super(message)
    this.name = "ApprovalInOtherChatError"
    this.ownerSessionId = ownerSessionId
    this.ownerTitle = ownerTitle
  }
}

function translateDecideError(path: string, vars?: Record<string, string | number>): string {
  const language = (
    queryClient.getQueryData(["settings"]) as
      | { preferences?: { language?: LanguagePref } }
      | undefined
  )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  return translate(messages, path, vars)
}

/** 行为测试用：禁止测试文件直接 value-import chat-store（合约入口）。 */
export function seedPendingApprovalForTest(input: {
  runId: string
  toolCallId: string
  approvalId: string
}): void {
  useChatStore.setState({
    pendingApproval: {
      type: "approval.required",
      runId: input.runId,
      toolCallId: input.toolCallId,
      approvalId: input.approvalId,
      name: "write_file",
      args: { path: "a.ts" }
    },
    runId: input.runId,
    error: null
  })
}

export function pendingApprovalErrorForTest(): string | null {
  return useChatStore.getState().error
}

export function resetPendingApprovalForTest(): void {
  useChatStore.setState({ pendingApproval: null, runId: null, error: null })
}
