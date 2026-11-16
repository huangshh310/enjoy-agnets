/**
 * 733 底栏只留一行（段 A）：按容器实测宽度选级的纯函数。
 * 8 态 7 步：L0 自然 → L1 紧凑选择器 → L2 图标化 → L3a 模型压窄 → L3b 三颗可选 chip 进菜单
 * → L3c 计量进菜单 → L3d 收藏进菜单 → L3e 预览进菜单。
 * 降级看当前级自己的实测宽；升级只看目标级自己实测的宽 + 8px 回滞（C4），缺缓存就探一级。
 */

export const FOOTER_UPGRADE_HYSTERESIS_PX = 8
export const FOOTER_SUBPIXEL_PX = 0.5
export const FOOTER_STEPS = ["0", "1", "2", "3a", "3b", "3c", "3d", "3e"] as const
export const FOOTER_MAX_STEPS = FOOTER_STEPS.length - 1

export type FooterStep = (typeof FOOTER_STEPS)[number]
export type FooterDensity = 0 | 1 | 2 | 3
export type FooterOverflowLevel = "a" | "b" | "c" | "d" | "e"
export type FooterWidths = { left: number; right: number }
export type FooterWidthCache = Partial<Record<FooterStep, FooterWidths>>

/** 级别 ≥1 / ≥2 / ≥3 的 Tailwind 变体（只认 row 上的 `group/footer` + `data-footer-density`，L0 不命中）。 */
export const FOOTER_GE1_HIDDEN =
  "group-data-[footer-density=1]/footer:hidden group-data-[footer-density=2]/footer:hidden group-data-[footer-density=3]/footer:hidden"
export const FOOTER_GE2_HIDDEN =
  "group-data-[footer-density=2]/footer:hidden group-data-[footer-density=3]/footer:hidden"
export const FOOTER_GE2_ICON_BUTTON =
  "group-data-[footer-density=2]/footer:size-7 group-data-[footer-density=2]/footer:justify-center group-data-[footer-density=2]/footer:px-0 group-data-[footer-density=3]/footer:size-7 group-data-[footer-density=3]/footer:justify-center group-data-[footer-density=3]/footer:px-0"
/** 模型 chip：L1 / L2 短名 max 128；L3a 起压到 72；L≥1 min 72（单行省略号，title 仍是完整名）。 */
export const FOOTER_MODEL_CHIP_WIDTH =
  "group-data-[footer-density=1]/footer:max-w-[128px] group-data-[footer-density=1]/footer:min-w-[72px] group-data-[footer-density=2]/footer:max-w-[128px] group-data-[footer-density=2]/footer:min-w-[72px] group-data-[footer-density=3]/footer:max-w-[72px] group-data-[footer-density=3]/footer:min-w-[72px]"
/** 左组裁切壳：只在 L≥1 横向裁切（-mx-1 px-1 让裁切边各让出 4px，首项 ring / 阴影不被裁）；L0 不命中，1440 合成层与现网一致。 */
export const FOOTER_LEFT_CLIP =
  "group-data-[footer-density=1]/footer:-mx-1 group-data-[footer-density=1]/footer:overflow-x-clip group-data-[footer-density=1]/footer:px-1 group-data-[footer-density=2]/footer:-mx-1 group-data-[footer-density=2]/footer:overflow-x-clip group-data-[footer-density=2]/footer:px-1 group-data-[footer-density=3]/footer:-mx-1 group-data-[footer-density=3]/footer:overflow-x-clip group-data-[footer-density=3]/footer:px-1"
/** 只在 L≥2 才显示的图标（L0 / L1 display:none，1440 零像素）。 */
export const FOOTER_GE2_ONLY_INLINE =
  "hidden group-data-[footer-density=2]/footer:inline-flex group-data-[footer-density=3]/footer:inline-flex"

export function footerStepIndex(step: FooterStep): number {
  return FOOTER_STEPS.indexOf(step)
}

export function footerDensityOf(step: FooterStep): FooterDensity {
  return Number(step[0]) as FooterDensity
}

export function footerOverflowOf(step: FooterStep): FooterOverflowLevel | undefined {
  return step.length > 1 ? (step[1] as FooterOverflowLevel) : undefined
}

/** 某项在该级是否已经交给溢出菜单渲染（L3b 三颗 chip · L3c 计量 · L3d 收藏 · L3e 预览）。 */
export function footerOverflowItems(step: FooterStep): {
  chips: boolean
  meter: boolean
  library: boolean
  preview: boolean
} {
  const i = footerStepIndex(step)
  return {
    chips: i >= footerStepIndex("3b"),
    meter: i >= footerStepIndex("3c"),
    library: i >= footerStepIndex("3d"),
    preview: i >= footerStepIndex("3e")
  }
}

export function footerFits(
  cache: FooterWidthCache,
  step: FooterStep,
  rowInner: number,
  gapX: number,
  slack: number
): boolean {
  const w = cache[step]
  return w != null && w.left + w.right + gapX + slack <= rowInner
}

export type FooterDecision = { next: FooterStep; probe: boolean }

export function pickFooterDensity(input: {
  cur: FooterStep
  rowInner: number
  gapX: number
  cache: FooterWidthCache
  /** 上一步是从这一级「升级探测」过来的：本级刚量到，必须带 +8 回滞放得下，否则退回原级。 */
  upgradeProbeFrom?: FooterStep
}): FooterDecision {
  const { cur, rowInner, gapX, cache, upgradeProbeFrom } = input
  const i = footerStepIndex(cur)
  if (
    upgradeProbeFrom &&
    footerStepIndex(upgradeProbeFrom) === i + 1 &&
    cache[cur] &&
    !footerFits(cache, cur, rowInner, gapX, FOOTER_UPGRADE_HYSTERESIS_PX)
  ) {
    return { next: upgradeProbeFrom, probe: false }
  }
  // 1. 降级：当前级放不下（容 0.5px 亚像素）
  if (cache[cur] && !footerFits(cache, cur, rowInner, gapX, -FOOTER_SUBPIXEL_PX)) {
    for (let j = i + 1; j < FOOTER_STEPS.length; j += 1) {
      const s = FOOTER_STEPS[j]!
      if (!cache[s]) return { next: s, probe: true }
      if (footerFits(cache, s, rowInner, gapX, -FOOTER_SUBPIXEL_PX)) return { next: s, probe: false }
    }
    return { next: FOOTER_STEPS[FOOTER_STEPS.length - 1]!, probe: false }
  }
  // 2. 升级：只读目标级自己实测的宽（C4），每次只升一级
  if (i > 0 && cache[cur]) {
    const t = FOOTER_STEPS[i - 1]!
    if (!cache[t]) return { next: t, probe: true }
    if (footerFits(cache, t, rowInner, gapX, FOOTER_UPGRADE_HYSTERESIS_PX)) return { next: t, probe: false }
  }
  return { next: cur, probe: false }
}

/** hook 每次判级的纯核心（读相之后）：同步本级实测宽（变了就清全部缓存）、选级、计步（上限 7）、记升级探测来源。 */
export type FooterDecideState = {
  cache: FooterWidthCache
  stepsUsed: number
  upgradeProbeFrom?: FooterStep
}
export function footerDecide(
  state: FooterDecideState,
  input: { cur: FooterStep; rowInner: number; gapX: number; left: number; right: number }
): FooterStep | null {
  const { cur, rowInner, gapX, left, right } = input
  const prev = state.cache[cur]
  if (prev && (Math.abs(prev.left - left) > FOOTER_SUBPIXEL_PX || Math.abs(prev.right - right) > FOOTER_SUBPIXEL_PX)) {
    state.cache = {}
  }
  state.cache[cur] = { left, right }
  const probeFrom = state.upgradeProbeFrom
  state.upgradeProbeFrom = undefined
  const { next, probe } = pickFooterDensity({ cur, rowInner, gapX, cache: state.cache, upgradeProbeFrom: probeFrom })
  if (next === cur) return null
  // 探测退回永远放行（不计步）：否则步数恰好在探测级用完，会停在「不带 +8 也许放得下」的探测级，
  // 下一次 ±4 抖动就降级——正是回滞要防的来回跳。退回只会回到上一步已在的级，不会成环。
  const isProbeRevert = probeFrom !== undefined && next === probeFrom
  if (!isProbeRevert) {
    if (state.stepsUsed >= FOOTER_MAX_STEPS) return null
    state.stepsUsed += 1
  }
  if (probe && footerStepIndex(next) === footerStepIndex(cur) - 1) {
    state.upgradeProbeFrom = cur
  }
  return next
}
