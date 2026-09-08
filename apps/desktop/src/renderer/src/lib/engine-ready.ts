/**
 * 引擎就绪判断。不引用 ipc-contract，方便 node:test。
 */
const LOCAL_ID = "enjoy-local"

export function isEngineReady(tool: { id: string; status: string }): boolean {
  return tool.id === LOCAL_ID || tool.status === "ready"
}

export function canSwitchAgent(tool: {
  id: string
  status: string
  skillOnly?: boolean
  comingSoon?: boolean
}): boolean {
  if (tool.skillOnly || tool.comingSoon) return false
  return isEngineReady(tool)
}
