/**
 * 会话模型覆盖：只在当前引擎的名单里生效。
 * Enjoy 本地始终认。名单还没到（undefined）先保留；空名单或不含该 id 则丢掉。
 */
const ENJOY_LOCAL = "enjoy-local"

export function sessionOverlayOnEngine(input: {
  runtimeId?: string | null
  sessionModelId?: string | null
  /** undefined：名单未到。空数组：已到但没有这个 id。 */
  modelIds?: readonly string[] | null
}): string {
  const overlay = input.sessionModelId?.trim() ?? ""
  if (!overlay) return ""
  if ((input.runtimeId?.trim() || ENJOY_LOCAL) === ENJOY_LOCAL) return overlay
  if (input.modelIds == null) return overlay
  return input.modelIds.includes(overlay) ? overlay : ""
}
