/**
 * ACP 导入成功后把导入的会话切到前台。
 * 必须和侧栏点会话 / 左上返回走同一条切换（loadSession）：停车当前会话的轮（含审批卡、执行中、停止按钮）、
 * 存它的稿、给导入的会话复位成空闲。只 setSession 会把上一会话的 running / runId / 审批卡原样挂到导入的会话上，
 * 在那里点「批准」批的是上一会话的轮（jojo P1，#136 r6 gate）。
 * 导入的会话 main 里还没有消息，loadSession 回灌空列表后打「已回灌」；回灌失败也兜底打上，不停在加载占位（leo #157）。
 */
import { loadSession } from "../../../hooks/session-lifecycle"
import { markSessionHistoryHydrated } from "../../../hooks/session-history-pending"
import { useChatStore } from "../../../stores/chat-store"

export async function openImportedAcpSession(created: { id: string; title: string }, runtimeId: string): Promise<void> {
  // 先登记引擎：loadSession 按 sessionRuntimes 给前台选引擎。
  const before = useChatStore.getState()
  before.setSessionRuntimes({ ...before.sessionRuntimes, [created.id]: runtimeId })
  try {
    await loadSession(created.id, created.title)
  } catch (error) {
    // 导入本身已成功（会话已建、已绑定），回灌失败只记日志，前台照样停在导入的会话。
    console.warn("[acp-import] 打开导入的会话失败", created.id, error)
  }
  const store = useChatStore.getState()
  if (store.sessionId !== created.id) return
  store.setRuntimeId(runtimeId)
  markSessionHistoryHydrated(created.id)
}
