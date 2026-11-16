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

/**
 * 停靠侧栏（nav-card）在动画途中还会把聊天区推宽（+）/ 挤窄（−）多少 px：现宽 − 目标宽（目标宽就是它 inline style 的 width）。
 * 浮层侧栏不占主区、没在动画、量不到 → 0。只读 DOM，不读窗宽。
 */
export function footerSidebarShift(nav: { current: number; target: number; overlay: boolean } | null): number {
  if (!nav || nav.overlay || !Number.isFinite(nav.current) || !Number.isFinite(nav.target)) return 0
  const d = nav.current - nav.target
  return Math.abs(d) <= FOOTER_SUBPIXEL_PX ? 0 : d
}

/** 侧栏要把聊天区挤窄时，提前按落定后的宽度选级（行内宽加上负的 shift），动画一开始就落到终态级、全程单向不裁切。 */
export function footerTargetInner(inner: number, shift: number): number {
  return shift < 0 ? inner + shift : inner
}

/**
 * RO（容器宽度变化）触发的换级闸门（#228 luna H2 / jojo 768 拖窗）：
 * 窗口跨 768 时，窗口先变 ±8~16px、下一帧侧栏才开始收 / 展动画，聊天区宽度先「反向」一两帧再单调变化，
 * 照单全收会画出 3d→3e→3d / 3a→2→3a 这类来回。
 * - 停靠侧栏正在把聊天区推宽（shift > 0）：只升不降（降级只可能来自中途反向，交给尾随复核）。
 * - 停靠侧栏正在把聊天区挤窄（shift < 0）：选级已按目标宽算（footerTargetInner），直接提交，一步到终态。
 * - 侧栏不动：行宽没变（内容引起的 RO）照常提交；一串 RO 的第一下（距上一下超过一个空档）先不换级；
 *   串内宽度在变大时不降级、在变小时不升级，都交给尾随复核（最后一下 RO 之后两帧按落定宽度再判）。
 *   例外：串首这一下要降级、而当前级已超出行宽 FOOTER_RESIZE_DIP_PX 以上（大跨度拉窗，不是跨断点那一两帧的回弹），照常提交，免得左组被裁一大截。
 * 只决定「这一下提不提交」，不改选级本身（常量 / 回滞 / C1 不动）；尾随复核照常选级，终态与同宽静态一致。
 */
export const FOOTER_RESIZE_BURST_GAP_MS = 50
/** 跨窄窗断点时窗口单步回弹的上限（拖窗 2~16px，jojo 单跳 800→740 是 60px）。 */
export const FOOTER_RESIZE_DIP_PX = 96
/**
 * 跨窄窗断点拖窗（jojo 9b「逐步扫宽」）：停靠侧栏展开、窗宽已在断点上方 LOOKAHEAD 以内且还在变窄时，
 * 再窄一两 px 侧栏就自动收起、把聊天区推宽 ~220——这时降级多半只亮几帧就被推宽抵消（3d→3e→3d）。
 * 这段里的降级先等 WAIT_MS：拖过断点就直接随侧栏收起单向升级；停在这段里，WAIT_MS 后照常按同宽静态落级。
 */
export const FOOTER_AUTO_COLLAPSE_LOOKAHEAD_PX = 16
export const FOOTER_AUTO_COLLAPSE_WAIT_MS = 150
export function footerNearAutoCollapse(input: {
  /** 侧栏停靠且展开（不是浮层、没收起）。 */
  docked: boolean
  windowW: number
  lastWindowW: number | null
  /** 自动收起断点（app-shell NARROW_SIDEBAR_PX，窗宽 < 它即收起）。 */
  narrowPx: number
}): boolean {
  const { docked, windowW, lastWindowW, narrowPx } = input
  if (!docked || lastWindowW == null || !Number.isFinite(windowW)) return false
  return windowW >= narrowPx && windowW < narrowPx + FOOTER_AUTO_COLLAPSE_LOOKAHEAD_PX && windowW < lastWindowW - FOOTER_SUBPIXEL_PX
}
export function footerResizeGate(input: {
  cur: FooterStep
  next: FooterStep
  inner: number
  lastInner: number | null
  sinceLastMs: number
  shift?: number
  /** 当前级整行所需宽 − 行内宽（>0 即左组被裁）。 */
  overflow?: number
  /** footerNearAutoCollapse：窗宽在自动收起断点上方一小段且还在变窄。 */
  nearAutoCollapse?: boolean
}): "commit" | "defer" {
  const { cur, next, inner, lastInner, sinceLastMs, shift = 0, overflow = 0, nearAutoCollapse = false } = input
  const down = footerStepIndex(next) > footerStepIndex(cur)
  if (shift > FOOTER_SUBPIXEL_PX) return down ? "defer" : "commit"
  if (shift < -FOOTER_SUBPIXEL_PX) return "commit"
  if (down && nearAutoCollapse && overflow <= FOOTER_RESIZE_DIP_PX) return "defer"
  if (lastInner == null) return "commit"
  if (Math.abs(inner - lastInner) <= FOOTER_SUBPIXEL_PX) return "commit"
  if (sinceLastMs > FOOTER_RESIZE_BURST_GAP_MS) return down && overflow > FOOTER_RESIZE_DIP_PX ? "commit" : "defer"
  if (down && inner > lastInner + FOOTER_SUBPIXEL_PX) return "defer"
  if (!down && inner < lastInner - FOOTER_SUBPIXEL_PX) return "defer"
  return "commit"
}
