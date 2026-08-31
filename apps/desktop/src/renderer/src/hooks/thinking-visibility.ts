/**
 * 何时挂 Thinking：Agent 有推理 / 工具，或 Agent 仍在流式。
 * 生图轮没有 reasoning.delta / tool.*，不要画空时间线。
 */

export function shouldShowThinkingTrace(input: {
  reasoning: string
  toolCount: number
  streaming: boolean
  mediaSurface: boolean
}): boolean {
  if (input.reasoning.trim().length > 0 || input.toolCount > 0) return true
  if (input.mediaSurface) return false
  return input.streaming
}
