/**
 * 从已列出的模型读上下文窗口。数字由 main 解析（探测 / Gateway / 档案），渲染进程不猜。
 */
export function contextWindowForModel(
  models: ReadonlyArray<{ id: string; contextWindow?: number }>,
  modelId: string
): number | undefined {
  const window = models.find((model) => model.id === modelId)?.contextWindow
  return window && window > 0 ? window : undefined
}
