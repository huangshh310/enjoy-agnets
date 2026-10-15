/**
 * 新对话创建窗里输入框的归属（jojo #155 245dd0fc 实测）：
 * - 开创建窗：上一个会话的草稿图 / 引用已存进它自己的稿，这里清掉，绝不留给新对话（否则「第一条」会带走别人的旧图）。
 * - 会话建好：此刻输入框里的图是「正在准备…」期间新贴的，属于新会话——不清，绑到新会话的草稿。
 */
import { useAttentionStore } from "../stores/attention/attention-store"
import { idleComposerPatch } from "../stores/attention/session-run-park"
import { useChatStore } from "../stores/chat-store"
import { persistCreateWindowAssets } from "../lib/session-draft-storage"
import { clearComposerAssets } from "./composer-assets"
import { setQuotedContexts } from "./quoted-context"
import { markSessionHistoryHydrated } from "./session-history-pending"

/** 立刻露出欢迎页，但 sessionId 要等 create 回来。发送走排队，不占 running。 */
export function detachComposerForCreate(): void {
  useAttentionStore.getState().clearCompletes()
  useChatStore.setState({
    ...idleComposerPatch(),
    sessionId: null,
    messages: [],
    sessionTitle: "新对话",
    composer: "",
    running: false
  })
  clearComposerAssets()
  setQuotedContexts([])
}

/** 会话建好：复位运行态，输入框里准备中贴的图留着并落到新会话的草稿。 */
export function publishCreatedComposer(sessionId: string): void {
  // 新建的会话本来就没有历史：不等回灌，直接显示空态问候。
  markSessionHistoryHydrated(sessionId)
  useChatStore.setState({ ...idleComposerPatch() })
  persistCreateWindowAssets(sessionId)
}
