/**
 * 当前档案有密钥但默认路线没模型时，不要用目录第一项顶上。
 * 否则 NEED_MODEL 中性条永远看不见。
 */
export function settingsShouldLeaveModelEmpty(input: {
  hasEnjoySecret?: boolean
  profileId?: string
  routeModelId?: string
  defaultModelId?: string
  preferredModelId?: string
  sessionModelId?: string
}): boolean {
  if (!input.hasEnjoySecret || !input.profileId?.trim()) return false
  return ![
    input.routeModelId,
    input.defaultModelId,
    input.preferredModelId,
    input.sessionModelId
  ].some((id) => Boolean(id?.trim()))
}
