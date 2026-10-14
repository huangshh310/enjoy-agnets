/**
 * `?edit=<档案 id>`（向导「改密钥」）该怎么落地。
 * 列表没加载完先等；找到就开编辑器；加载完仍找不到（档案已删 / id 过期）回落到新建表单，
 * 不让向导停在暂停态、抽屉却没开。
 */
export type EditTargetAction = "none" | "wait" | "open" | "fallback-create"

export function editTargetAction(
  editId: string | undefined,
  providers: readonly { id: string }[],
  loaded: boolean
): EditTargetAction {
  if (!editId) return "none"
  if (providers.some((row) => row.id === editId)) return "open"
  return loaded ? "fallback-create" : "wait"
}

/** 请求结束就算加载完（成功或出错）：快照拿不到时 ?edit= 也要回落，不能让引导一直暂停。 */
export function settingsQueryLoaded(query: { isSuccess: boolean; isError: boolean }): boolean {
  return query.isSuccess || query.isError
}
