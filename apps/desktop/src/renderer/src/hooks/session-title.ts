/**
 * 首轮自动会话题：乐观截断立刻上屏并落库，后台用 Enjoy 文本模型精炼。
 */
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { isAcpComposerRuntime } from "../lib/agent-runtime"
import { getIde, hasIde } from "../lib/ide"
import {
  formatOptimisticTitle,
  isDefaultSessionTitle,
  sanitizeTitle,
  shouldRefineSessionTitle
} from "../lib/session-title"
import { useChatStore } from "../stores/chat-store"
import {
  onPreOutputRolledBack,
  onTurnProducedOutput,
  type PreOutputRolledBack
} from "../stores/pre-output-rollback-listeners"
import { composerRunKind } from "./composer-run-kind"
import { completePrompt } from "./use-completion"
import { collectRunOutput } from "./wait-run-events"

export {
  formatOptimisticTitle,
  isDefaultSessionTitle,
  sanitizeTitle,
  shouldRefineSessionTitle
} from "../lib/session-title"

/**
 * jojo P2（#136 gate2）：自动标题只来自会话第一句。那句出字前就失败、被回滚时，标题要回到发之前的占位，
 * 后台精炼也作废（不然过几秒又被改成生成的标题）。
 * leo r3 M2：记录只活到这一句「站住」（出字 / run.end）为止；复原前核对当前标题仍是本轮自动写的那个，
 * 用户手改过或之后的轮次（「从这里重来」再失败）都不动真标题。
 */
type FirstTurnTitle = { previous: string; written: string }
const firstTurnTitles = new Map<string, FirstTurnTitle>()
const titleEpoch = new Map<string, number>()

function epochOf(sessionId: string): number {
  return titleEpoch.get(sessionId) ?? 0
}

export function restoreTitleAfterPreOutputRollback(info: PreOutputRolledBack): void {
  const record = firstTurnTitles.get(info.sessionId)
  if (!record) return
  // 线程里还有别的用户句：标题不是这一句起的，不动。
  if (info.userTurnsLeft > 0) return
  firstTurnTitles.delete(info.sessionId)
  titleEpoch.set(info.sessionId, epochOf(info.sessionId) + 1)
  // 只撤本轮自动写的标题；当前标题已不是它（用户改过 / 别处改名）就不动。
  if (titleOfSession(info.sessionId) !== record.written) return
  patchSessionTitle(info.sessionId, record.previous)
  if (!hasIde() || !record.previous.trim()) return
  void getIde().session.rename({ sessionId: info.sessionId, title: record.previous }).catch(() => undefined)
}

/** 这一句已站住：自动标题成了真标题，之后的回滚不再碰它。 */
export function settleFirstTurnTitle(sessionId: string): void {
  firstTurnTitles.delete(sessionId)
}

onPreOutputRolledBack(restoreTitleAfterPreOutputRollback)
onTurnProducedOutput(settleFirstTurnTitle)

export function resetSessionTitleRollbackForTest(): void {
  firstTurnTitles.clear()
  titleEpoch.clear()
}

export function applyOptimisticTitle(userText: string) {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  if (!sessionId || !isDefaultSessionTitle(store.sessionTitle)) return
  const title = formatOptimisticTitle(userText)
  firstTurnTitles.set(sessionId, { previous: store.sessionTitle, written: title })
  patchSessionTitle(sessionId, title)
  if (!hasIde()) return
  void getIde().session.rename({ sessionId, title }).catch(() => undefined)
}

export async function completeSessionTitle(userText: string) {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  const startedTitle = store.sessionTitle
  if (!hasIde() || !sessionId) return
  const epoch = epochOf(sessionId)
  if (!shouldRefineSessionTitle(startedTitle, userText)) return

  const modelId = await pickTitleModelId()
  if (!modelId) return

  try {
    const output = await collectRunOutput(() =>
      completePrompt({
        sessionId,
        modelId,
        prompt: titlePrompt(userText)
      }) as Promise<{ runId: string }>
    )
    const title = sanitizeTitle(output.text)
    if (!title || isDefaultSessionTitle(title)) return
    // 这一句已被出字前回滚撕掉：精炼作废。
    if (epochOf(sessionId) !== epoch) return
    const current = titleOfSession(sessionId)
    if (!shouldRefineSessionTitle(current, userText)) return
    const renamed = (await getIde().session.rename({
      sessionId,
      title
    })) as { title: string }
    if (epochOf(sessionId) !== epoch) return
    // 精炼也是本轮自动写的：首句还没站住时，记下它，回滚时才认得出来。
    const record = firstTurnTitles.get(sessionId)
    if (record) firstTurnTitles.set(sessionId, { ...record, written: renamed.title })
    patchSessionTitle(sessionId, renamed.title)
  } catch {
    // 失败保留乐观标题，不打断主循环
  }
}

function titleOfSession(sessionId: string): string {
  const store = useChatStore.getState()
  const node = store.repositories.find((row) => row.id === sessionId)
  if (node?.name) return node.name
  return store.sessionId === sessionId ? store.sessionTitle : ""
}

function titlePrompt(userText: string): string {
  return `Generate a concise 3-8 word title for this conversation in the same language as the user input (e.g. if the request is Chinese, reply in concise Chinese). Reply with the title text ONLY, without quotes, prefixes, punctuations, or markdown.\n\nUser request:\n${userText.slice(0, 600)}`
}

/** ACP 的 CLI modelId 不进 Enjoy vault；精炼必须走本机默认文本模型。 */
async function pickTitleModelId(): Promise<string | undefined> {
  const store = useChatStore.getState()
  if (
    !isAcpComposerRuntime(store.runtimeId) &&
    store.modelId &&
    composerRunKind(store.modelId) === "agent"
  ) {
    return store.modelId
  }
  if (store.preferredModelId) return store.preferredModelId
  if (!hasIde()) return undefined
  try {
    const snapshot = (await getIde().settings.get()) as SettingsSnapshot
    return snapshot.defaultModelId || undefined
  } catch {
    return undefined
  }
}

export function patchSessionTitle(sessionId: string, title: string) {
  const store = useChatStore.getState()
  store.patchSessionNode(sessionId, { name: title })
  if (store.sessionId === sessionId) {
    useChatStore.setState({ sessionTitle: title })
  }
}
