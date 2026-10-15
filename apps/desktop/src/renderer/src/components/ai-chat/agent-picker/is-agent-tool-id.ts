/** 纯判定（不带 JSX），供 store / 行为测试直接加载。 */
import { AgentToolId } from "@enjoy-agents/ipc-contract"

export function isAgentToolId(id: string): id is AgentToolId {
  return AgentToolId.safeParse(id).success
}
