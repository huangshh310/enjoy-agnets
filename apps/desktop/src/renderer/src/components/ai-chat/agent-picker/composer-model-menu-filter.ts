/**
 * Composer 模型菜单的分组与搜索。设置页双栏不走这里。
 */

export type MenuModel = {
  id: string
  label: string
  providerName?: string
}

export type MenuGroup<T extends MenuModel = MenuModel> = {
  key: string
  providerName: string
  models: T[]
}

/** 多家供应商时先选一家，名单不把各家叠在一起。 */
export function needsProviderMenu(groupCount: number): boolean {
  return groupCount > 1
}

/** 当前模型所属供应商；没有就用第一家。 */
export function providerKeyForModel(groups: readonly MenuGroup[], modelId: string): string {
  const id = modelId.trim()
  const hit = id ? groups.find((group) => group.models.some((model) => model.id === id)) : undefined
  return hit?.key ?? groups[0]?.key ?? ""
}

/** 只留选中的那一家，再按搜索词过滤。 */
export function modelsInProvider<T extends MenuModel>(
  groups: readonly MenuGroup<T>[],
  providerKey: string,
  query: string
): MenuGroup<T>[] {
  const group = groups.find((item) => item.key === providerKey) ?? groups[0]
  if (!group) return []
  return filterGroupedModels([group], query)
}

/** 当前模型所在分组提到最前，打开就能看到勾。 */
export function promoteCurrentGroup<T extends MenuModel>(groups: readonly MenuGroup<T>[], modelId: string): MenuGroup<T>[] {
  const id = modelId.trim()
  const index = id ? groups.findIndex((group) => group.models.some((model) => model.id === id)) : -1
  if (index <= 0) return [...groups]
  const next = [...groups]
  const [current] = next.splice(index, 1)
  return current ? [current, ...next] : next
}

/** 搜索同时匹配名称、id 和供应商名，空查询原样返回。 */
export function filterGroupedModels<T extends MenuModel>(groups: readonly MenuGroup<T>[], query: string): MenuGroup<T>[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...groups]
  return groups.flatMap((group) => {
    const models = group.models.filter((model) => modelMatches(model, group.providerName, q))
    return models.length > 0 ? [{ ...group, models }] : []
  })
}

function modelMatches(model: MenuModel, groupName: string, query: string): boolean {
  return [model.label, model.id, model.providerName, groupName].some((value) => value?.toLowerCase().includes(query))
}
