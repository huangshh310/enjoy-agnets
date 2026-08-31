/**
 * Provider 文件引用缓存键：同一 hash + 供应商 + 模型族可复用，避免重复 uploadFile。
 */
export function modelFamilyOf(modelId: string): string {
  const head = modelId.split(/[/:-]/)[0]
  return head || modelId
}

export function providerRefCacheKey(input: {
  providerId: string
  modelFamily: string
  fileHash: string
  scope?: string
}): string {
  return [input.providerId, input.modelFamily, input.fileHash, input.scope ?? "default"].join(":")
}
