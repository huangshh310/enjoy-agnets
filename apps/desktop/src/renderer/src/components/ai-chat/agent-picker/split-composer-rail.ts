/**
 * 导轨硬分组：本地 = Enjoy Local；其余已接线引擎进本机助手。
 */
const LOCAL_ID = "enjoy-local"

export function splitComposerRail<T extends { id: string; comingSoon?: boolean }>(
  tabs: T[]
): { local: T[]; cli: T[]; soon: T[] } {
  const primary = tabs.filter((item) => !item.comingSoon)
  return {
    local: primary.filter((item) => item.id === LOCAL_ID),
    cli: primary.filter((item) => item.id !== LOCAL_ID),
    soon: tabs.filter((item) => item.comingSoon)
  }
}
