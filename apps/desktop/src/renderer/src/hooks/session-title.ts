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
import { composerRunKind } from "./composer-run-kind"
import { completePrompt } from "./use-completion"
import { collectRunOutput } from "./wait-run-events"

export {
  formatOptimisticTitle,
  isDefaultSessionTitle,
  sanitizeTitle,
  shouldRefineSessionTitle
} from "../lib/session-title"

export function applyOptimisticTitle(userText: string) {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  if (!sessionId || !isDefaultSessionTitle(store.sessionTitle)) return
  const title = formatOptimisticTitle(userText)
  patchSessionTitle(sessionId, title)
  if (!hasIde()) return
  void getIde().session.rename({ sessionId, title })
}

export async function completeSessionTitle(userText: string) {
  const store = useChatStore.getState()
  const sessionId = store.sessionId
  if (!hasIde() || !sessionId) return
  if (!shouldRefineSessionTitle(store.sessionTitle, userText)) return

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
    if (!shouldRefineSessionTitle(useChatStore.getState().sessionTitle, userText)) return
    const renamed = (await getIde().session.rename({
      sessionId,
      title
    })) as { title: string }
    patchSessionTitle(sessionId, renamed.title)
  } catch {
    // 失败保留乐观标题，不打断主循环
  }
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

function patchSessionTitle(sessionId: string, title: string) {
  const store = useChatStore.getState()
  if (store.sessionId === sessionId) {
    store.setSession(sessionId, title)
    return
  }
  useChatStore.setState({
    repositories: store.repositories.map((node) =>
      node.id === sessionId ? { ...node, name: title } : node
    )
  })
}
