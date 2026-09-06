/**
 * 对外模型目录策略：只来自已配置档案。
 * 空 vault 必须返回 []，禁止回退 DeepSeek 预设。
 */
export function listedModelsFromProfiles<T extends { id: string }, M>(
  profiles: readonly T[],
  activeId: string | null,
  modelsOf: (profile: T, isActive: boolean) => M[]
): M[] {
  if (profiles.length === 0) return []
  return profiles.flatMap((profile) => modelsOf(profile, profile.id === activeId))
}
