/**
 * 从已列出的模型读上下文窗口。数字由 main 解析（探测 / Gateway / 档案），渲染进程不猜。
 */
export function contextWindowForModel(
  models: ReadonlyArray<{ id: string; contextWindow?: number }>,
  modelId: string
): number | undefined {
  const id = modelId.trim()
  if (!id) return undefined
  const exact = models.find((model) => model.id === id)
  if (exact?.contextWindow && exact.contextWindow > 0) return exact.contextWindow
  const suffix = models.find((model) => model.id.endsWith(`/${id}`) && (model.contextWindow ?? 0) > 0)
  return suffix?.contextWindow
}
