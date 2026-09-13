/**
 * Agent 品牌标工具函数：尺寸解析与 ID 归一化。
 */
export function resolveIconSize(size?: number, className?: string): number {
  if (typeof size === "number" && size > 0) return size
  if (className) {
    const match = className.match(/(?:^|\s)size-(?:\[(\d+)px\]|([0-9.]+))(?=\s|$)/)
    if (match) {
      if (match[1]) return parseInt(match[1], 10)
      const val = parseFloat(match[2])
      return Math.round(val * 4)
    }
  }
  return 16
}

export function normalizeAgentId(rawId: string): string {
  let id = rawId.toLowerCase().trim()
  if (id.startsWith("workspace-")) {
    id = id.slice("workspace-".length)
  }
  if (id.startsWith("custom:")) {
    id = id.slice("custom:".length)
  }
  if (id === "enjoy" || id === "enjoy-agents") {
    return "enjoy-local"
  }
  if (id === "hermes-agent") {
    return "hermes"
  }
  return id
}
