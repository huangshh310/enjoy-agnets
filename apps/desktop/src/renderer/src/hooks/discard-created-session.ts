/**
 * 新建会话还没被用户留下，后一次导航就已经把它作废。
 * 只删这次创建的空会话，不动用户已经打开的别的页。
 * 发送闸失败可 keepComposer：留下还文和 notice，不要 idle patch 抹掉。
 */
import { clearComposerAssets } from "./composer-assets"
import { setQuotedContexts } from "./quoted-context"
import { getIde } from "../lib/ide"
import { idleComposerPatch } from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"
import { listFollowups } from "./followup-queue"

export async function discardCreatedSession(
  sessionId: string,
  stale?: () => boolean,
  opts?: { keepComposer?: boolean; onlyIfEmpty?: boolean }
): Promise<boolean> {
  if (!stale?.()) return false
  // leo soft（#163）：会话里还有排队的消息就不删（看门狗清会话 / 失败回滚都经这里），和离开时的规则（P7）一致。
  if (listFollowups(sessionId).length > 0) return false
  if (useChatStore.getState().sessionId === sessionId) {
    clearDiscardedForeground(opts?.keepComposer === true)
  }
  forgetSessionRuntime(sessionId)
  await getIde()
    .session.delete({ sessionId, onlyIfEmpty: opts?.onlyIfEmpty === true })
    .catch(() => undefined)
  return true
}

function clearDiscardedForeground(keepComposer = false) {
  const current = useChatStore.getState()
  useChatStore.setState({
    ...idleComposerPatch(),
    sessionId: null,
    messages: [],
    sessionTitle: "新对话",
    composer: keepComposer ? current.composer : "",
    error: keepComposer ? current.error : null,
    notice: keepComposer ? current.notice : null
  })
  if (keepComposer) return
  clearComposerAssets()
  setQuotedContexts([])
}

function forgetSessionRuntime(sessionId: string) {
  const store = useChatStore.getState()
  if (!store.sessionRuntimes[sessionId]) return
  const sessionRuntimes = { ...store.sessionRuntimes }
  delete sessionRuntimes[sessionId]
  store.setSessionRuntimes(sessionRuntimes)
}
