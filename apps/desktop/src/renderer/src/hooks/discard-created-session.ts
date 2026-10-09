/**
 * 新建会话还没被用户留下，后一次导航就已经把它作废。
 * 只删这次创建的空会话，不动用户已经打开的别的页。
 */
import { clearComposerAssets } from "./composer-assets"
import { setQuotedContexts } from "./quoted-context"
import { getIde } from "../lib/ide"
import { idleComposerPatch } from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"

export async function discardCreatedSession(sessionId: string, stale?: () => boolean): Promise<boolean> {
  if (!stale?.()) return false
  if (useChatStore.getState().sessionId === sessionId) clearDiscardedForeground()
  forgetSessionRuntime(sessionId)
  await getIde().session.delete({ sessionId }).catch(() => undefined)
  return true
}

function clearDiscardedForeground() {
  useChatStore.setState({
    ...idleComposerPatch(),
    sessionId: null,
    messages: [],
    sessionTitle: "新对话",
    composer: ""
  })
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
