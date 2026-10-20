/**
 * Inspector 展开尺寸。
 * react-resizable-panels 的 expand() 回到 collapse 前的百分比；
 * 默认收起时上次是 0，库会写成 1%，看起来像点了没开。
 *
 * Stage 禁止收到 0：最大化审查栏只把工作台压到 42%，切模块再拉回 62%。
 */

export const INSPECTOR_DEFAULT_SIZE = "38%"
export const INSPECTOR_MIN_PX = 280
export const STAGE_DEFAULT_PERCENT = 62
export const INSPECTOR_DEFAULT_PERCENT = 38
export const STAGE_DEFAULT_SIZE = `${STAGE_DEFAULT_PERCENT}%`
export const STAGE_WHEN_INSPECTOR_WIDE = "42%"
export const STAGE_MIN_PERCENT = 25
export const STAGE_TINY_PX = 80

/** 展开后宽度仍小于最小栏宽时，强制拉回默认 38%。 */
export function needsInspectorDefaultSize(sizePx: number): boolean {
  return sizePx < INSPECTOR_MIN_PX
}

/** localStorage 里若把 chat 存成 0/1%，下次启动会只剩审查栏。 */
export function sanitizeSplitLayout(
  layout: Record<string, number>
): Record<string, number> {
  const chat = layout.chat
  if (typeof chat === "number" && chat < STAGE_MIN_PERCENT) {
    return { ...layout, chat: STAGE_DEFAULT_PERCENT, changes: INSPECTOR_DEFAULT_PERCENT }
  }
  return layout
}

/** 工作台 Panel 的 minSize（stage-split.tsx），和分隔条宽一起决定并排放不放得下审查栏。 */
export const STAGE_MIN_PX = 360
export const INSPECTOR_SEPARATOR_PX = 12
/** 抽屉最宽；窄窗里给主区左侧至少留一条边，看得出是盖在上面的。 */
export const INSPECTOR_DRAWER_MAX_PX = 420
export const INSPECTOR_DRAWER_GUTTER_PX = 24
/** 聊天顶栏高（chat-stage-header h-12）：抽屉从顶栏下沿开始，顶栏的开关一直露出、可点。 */
export const INSPECTOR_DRAWER_TOP_INSET_PX = 48

/**
 * 分栏宽度放不下「工作台 360 + 分隔条 + 审查栏 280」时，审查栏改成覆盖式抽屉。
 * 不然 react-resizable-panels 只能把它压成 0、画在窗外（768 / 733 宽，g157b-25 / pr157-gate-05-768）。
 * 0 = 还没量到宽度，按并排处理。
 */
export function inspectorUsesDrawer(groupWidthPx: number): boolean {
  if (!(groupWidthPx > 0)) return false
  return groupWidthPx < STAGE_MIN_PX + INSPECTOR_SEPARATOR_PX + INSPECTOR_MIN_PX
}

/** 抽屉宽：最多 420，至少给左边留 24 的缝；分栏本身再窄也不小于 0。 */
export function inspectorDrawerWidth(groupWidthPx: number): number {
  return Math.max(0, Math.min(INSPECTOR_DRAWER_MAX_PX, groupWidthPx - INSPECTOR_DRAWER_GUTTER_PX))
}

export type InspectorPanelSize = { asPercentage: number; inPixels: number }

/** 用户拖完分隔条 / 点完加宽、复原后记下的宽度（百分比）；不足最小栏宽（被压扁 / 收起）不记。 */
export function preferredInspectorPercent(size: InspectorPanelSize): number | null {
  if (size.inPixels < INSPECTOR_MIN_PX || !(size.asPercentage > 0)) return null
  return size.asPercentage
}

/**
 * 分栏变宽（含从抽屉回到并排）后审查栏要不要拉回：比用户上次的百分比窄、或不足最小栏宽（被压成 0）就拉回，
 * 目标是用户上次的百分比，没有记录用默认 38%。不用拉回时为 null。
 */
export function inspectorRestorePercent(size: InspectorPanelSize, preferredPercent: number | null): number | null {
  const target = preferredPercent != null && preferredPercent > 0 ? preferredPercent : INSPECTOR_DEFAULT_PERCENT
  if (size.inPixels < INSPECTOR_MIN_PX) return target
  return size.asPercentage < target - 0.5 ? target : null
}

/** 按百分比打开；这个百分比在当前分栏里不到最小栏宽（1000 宽分栏约 682，38% ≈ 259px，库会吸成 0）时按 280px 打开。 */
export function inspectorOpenSize(targetPercent: number, groupPx: number): string {
  if (groupPx > 0 && (targetPercent / 100) * groupPx < INSPECTOR_MIN_PX + 1) return `${INSPECTOR_MIN_PX}px`
  return `${targetPercent}%`
}
