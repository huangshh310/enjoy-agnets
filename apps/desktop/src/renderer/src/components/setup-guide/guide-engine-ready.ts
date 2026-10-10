/**
 * 引导里「就绪」跟 main 引擎数同一套算法。
 * 目录里的 available 只表示这个引擎可以对接，不表示本机已经装上。
 */
import { showsAvailableEngine } from "@enjoy-agents/ipc-contract/chat-readiness"

export function guideEngineShowsReady(tool: {
  id: string
  status: string
  comingSoon: boolean
  skillOnly?: boolean
}): boolean {
  return showsAvailableEngine(tool)
}
