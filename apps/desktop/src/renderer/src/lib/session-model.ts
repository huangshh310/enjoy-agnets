/**
 * 会话有效模型：会话覆盖 > 引擎默认 > 档案 models[0]。
 * 同引擎换模不是 handoff。
 */

export function getEffectiveModel(input: {
  sessionId: string | null
  sessionModels: Record<string, string>
  engineDefault?: string | null
  catalogFirst?: string | null
}): string | undefined {
  if (input.sessionId) {
    const overlay = input.sessionModels[input.sessionId]?.trim()
    if (overlay) return overlay
  }
  const engine = input.engineDefault?.trim()
  if (engine) return engine
  const first = input.catalogFirst?.trim()
  return first || undefined
}

/** 有用户轮只写会话覆盖；空会话可同时写偏好默认。 */
export function planSessionModelWrite(input: { hasUserTurns: boolean }): {
  writeSession: true
  writePreferenceDefault: boolean
} {
  return {
    writeSession: true,
    writePreferenceDefault: !input.hasUserTurns
  }
}

/** 新会话只用偏好默认 / 档案，禁止吃上一会话的 store.modelId。 */
export function composerModelForSession(input: {
  sessionId: string
  sessionModels: Record<string, string>
  preferredModelId?: string | null
  catalogFirst?: string | null
}): string | undefined {
  return getEffectiveModel({
    sessionId: input.sessionId,
    sessionModels: input.sessionModels,
    engineDefault: input.preferredModelId,
    catalogFirst: input.catalogFirst
  })
}

export function nextPreferredModelId(input: {
  writePreferenceDefault: boolean
  nextModelId: string
  previousPreferred?: string | null
}): string {
  if (input.writePreferenceDefault) return input.nextModelId.trim()
  return input.previousPreferred?.trim() || ""
}

export function composerModelPatch(input: {
  sessionId: string
  sessionModels: Record<string, string>
  preferredModelId?: string | null
  models: ReadonlyArray<{ id: string; label: string; provider?: string }>
}): { modelId: string; modelLabel: string; provider?: string } {
  const modelId =
    composerModelForSession({
      sessionId: input.sessionId,
      sessionModels: input.sessionModels,
      preferredModelId: input.preferredModelId,
      catalogFirst: input.models[0]?.id
    }) ?? ""
  const catalog = input.models.find((item) => item.id === modelId)
  return { modelId, modelLabel: catalog?.label ?? "", provider: catalog?.provider }
}

export function shouldShowModelSwitchBadge(input: {
  sessionId: string | null
  sessionModels: Record<string, string>
  engineDefault?: string | null
  hasUserTurns: boolean
}): boolean {
  if (!input.sessionId || !input.hasUserTurns) return false
  const overlay = input.sessionModels[input.sessionId]?.trim()
  if (!overlay) return false
  const engine = input.engineDefault?.trim()
  if (!engine) return true
  return overlay !== engine
}
