/**
 * 引导里「就绪」的唯一算法。
 * 目录里的 available 只表示这个引擎可以对接，不表示本机已经装上。
 * 没探测到时 status 是 missing，才出现安装或复制命令。
 */
export function guideEngineShowsReady(tool: {
  id: string
  status: string
  comingSoon: boolean
}): boolean {
  if (tool.comingSoon || tool.status === "comingSoon" || tool.status === "skillOnly") return false
  return tool.id === "enjoy-local" || tool.status === "ready"
}
