/**
 * 会话刻度条「当前位置」判定（纯函数，node:test）。只是显示层：读 IntersectionObserver 的可见面积，不碰 store。
 * #228 M2（luna / leo）：对话区被审批卡压到几十 px 时，可见的多半是助手消息或面积为 0 的节点；
 * 旧逻辑把助手消息 id 直接当当前位置，PreviewRail 找不到就回落 items[0]，刻度跳到第 1 句。
 * - 面积为 0 / 不在视口内的节点不参与；
 * - 最可见的是助手消息：算到它前面那一句用户刻度上；
 * - 判不出来：停在上一次的结果；上一次也不是刻度：落最后一句（不退回第 1 句）。
 */
export type RailVisible = { ratio: number; area: number }

export function pickRailActive(input: {
  /** 当前可见（面积 > 0）的消息：id → 比例 / 面积 */
  visible: ReadonlyMap<string, RailVisible>
  /** 会话里所有消息 id（时间顺序，含助手） */
  order: readonly string[]
  /** 刻度条目 id（时间顺序） */
  itemIds: readonly string[]
  previous: string
}): string {
  const { visible, order, itemIds, previous } = input
  const items = new Set(itemIds)
  let best: { id: string; ratio: number; area: number; index: number } | null = null
  for (const [id, v] of visible) {
    if (!(v.area > 0) || !(v.ratio > 0)) continue
    const index = order.indexOf(id)
    if (index < 0) continue
    if (!best || v.ratio > best.ratio || (v.ratio === best.ratio && (v.area > best.area || (v.area === best.area && index > best.index)))) {
      best = { id, ratio: v.ratio, area: v.area, index }
    }
  }
  if (best) {
    for (let i = best.index; i >= 0; i -= 1) {
      const id = order[i]!
      if (items.has(id)) return id
    }
  }
  return resolveRailActive(previous, itemIds)
}

/** 交给 PreviewRail 的 activeId：不是刻度就落最后一句（PreviewRail 自己的兜底是 items[0]，这里先兜住）。 */
export function resolveRailActive(activeId: string, itemIds: readonly string[]): string {
  if (itemIds.includes(activeId)) return activeId
  return itemIds.at(-1) ?? ""
}
