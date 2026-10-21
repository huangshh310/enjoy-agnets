/**
 * rewind-ime-real-hooks.spec.ts 的页面入口（esbuild 现打包，跑在 headless Chrome 里，不启动 Electron / 不碰共享实例）。
 * 真 React 19 + 真 useComposerIme（受控 textarea 的 shown）+ 真 chat-store + 真 rewind-pending / composer-writeback，
 * 切会话走 loadSession 里同步的那一段（flushComposerDomToStore → saveCurrentSessionDraft → setSession → restoreComposerForSession）。
 */
import { createRoot } from "react-dom/client"
import { useChatStore } from "../src/renderer/src/stores/chat-store"
import { useComposerIme } from "../src/renderer/src/components/ai-chat/composer/mentions/use-composer-ime"
import * as pending from "../src/renderer/src/hooks/rewind-pending"
import * as ime from "../src/renderer/src/hooks/composer-ime"
import { flushComposerDomToStore } from "../src/renderer/src/hooks/composer-dom"
import { restoreComposerForSession, saveCurrentSessionDraft } from "../src/renderer/src/hooks/session-lifecycle"

function Composer() {
  const composer = useChatStore((s) => s.composer)
  const setComposer = useChatStore((s) => s.setComposer)
  const h = useComposerIme(composer, setComposer)
  return (
    <textarea
      data-testid="composer-input"
      value={h.value}
      onChange={(event) => h.onValueChange(event)}
      onCompositionStart={h.onCompositionStart}
      onCompositionUpdate={h.onCompositionUpdate}
      onCompositionEnd={h.onCompositionEnd}
    />
  )
}

/** loadSession 换会话那一段（同步部分）。 */
function switchSession(sessionId: string) {
  flushComposerDomToStore()
  saveCurrentSessionDraft()
  useChatStore.getState().setSession(sessionId, sessionId)
  restoreComposerForSession(sessionId)
}

// 应用里由 rewind-from-here.ts 模块加载时装（关窗落草稿、切会话订阅、读回上次的记录）。
pending.installPendingRewinds()
;(window as unknown as { __rewind: unknown }).__rewind = { useChatStore, pending, ime, switchSession }
createRoot(document.getElementById("root")!).render(<Composer />)
