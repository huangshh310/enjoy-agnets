/**
 * 733 底栏只留一行（段 A）：选级纯函数 + 源码不变量 + 黄点 parity。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  FOOTER_MAX_STEPS,
  FOOTER_RESIZE_BURST_GAP_MS,
  FOOTER_RESIZE_DIP_PX,
  FOOTER_STEPS,
  FOOTER_UPGRADE_HYSTERESIS_PX,
  footerDecide,
  footerDensityOf,
  footerSidebarIntent,
  footerOverflowItems,
  footerOverflowOf,
  footerResizeGate,
  footerSidebarShift,
  footerStepIndex,
  footerTargetInner,
  pickFooterDensity,
  type FooterStep,
  type FooterWidthCache
} from "./footer-density.ts"
import { footerDotTone, hostInjectChipShown } from "./footer-dot-tone.ts"
import { initSidebarCollapse, NARROW_SIDEBAR_PX, narrowSidebarWindow, onSidebarManual } from "../../app-shell/chrome/sidebar-collapse-state.ts"
import { hostInjectWarns, type HostInjectBarView } from "./host-inject/host-inject-view.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const read = (name: string) => readFileSync(join(dir, name), "utf8").replace(/\r\n/g, "\n")
const GAP = 4

/** 单调递减的 natural 表：left 随级别不增，right 在 L2 收窄。 */
function table(left: number[], right: number[]): FooterWidthCache {
  const cache: FooterWidthCache = {}
  FOOTER_STEPS.forEach((s, i) => {
    cache[s] = { left: left[i]!, right: right[i]! }
  })
  return cache
}
// 近似 luna 实测（en，运行中并排）：L0 自然 / L1 去引擎重复 / L2 图标化 / L3a 模型 72 / L3b 三颗 chip 进菜单 …
const EN = table([640, 470, 395, 345, 40 + 305 - 305, 30, 0, 0].map((v, i) => [640, 470, 395, 345, 300, 270, 240, 210][i]!), [300, 300, 190, 190, 190, 190, 190, 190])
const need = (c: FooterWidthCache, s: FooterStep) => c[s]!.left + c[s]!.right + GAP

/** 模拟 hook：给定 rowInner，从 cur 开始反复判定直到不动（缓存完整，探测即直接量到）。 */
function settle(cache: FooterWidthCache, cur: FooterStep, rowInner: number): { step: FooterStep; steps: number } {
  let step = cur
  let steps = 0
  let probeFrom: FooterStep | undefined
  for (;;) {
    const { next, probe } = pickFooterDensity({ cur: step, rowInner, gapX: GAP, cache, upgradeProbeFrom: probeFrom })
    probeFrom = probe && FOOTER_STEPS.indexOf(next) === FOOTER_STEPS.indexOf(step) - 1 ? step : undefined
    if (next === step) return { step, steps }
    step = next
    steps += 1
    assert.ok(steps <= FOOTER_MAX_STEPS, "步数上限 7")
  }
}

test("8 态 7 步；density 只报 0–3，L3 子级报 a–e", () => {
  assert.deepEqual([...FOOTER_STEPS], ["0", "1", "2", "3a", "3b", "3c", "3d", "3e"])
  assert.equal(FOOTER_MAX_STEPS, 7)
  assert.deepEqual(FOOTER_STEPS.map(footerDensityOf), [0, 1, 2, 3, 3, 3, 3, 3])
  assert.deepEqual(FOOTER_STEPS.map(footerOverflowOf), [undefined, undefined, undefined, "a", "b", "c", "d", "e"])
  assert.deepEqual(footerOverflowItems("3a"), { chips: false, meter: false, library: false, preview: false })
  assert.deepEqual(footerOverflowItems("3b"), { chips: true, meter: false, library: false, preview: false })
  assert.deepEqual(footerOverflowItems("3e"), { chips: true, meter: true, library: true, preview: true })
})

test("选级表：宽够就 L0，越窄越往后，每级都是最浅的能放下的级", () => {
  assert.equal(settle(EN, "0", 1048).step, "0")
  for (let i = 0; i < FOOTER_STEPS.length; i += 1) {
    const s = FOOTER_STEPS[i]!
    // 恰好放得下 s、放不下更浅一级
    const w = need(EN, s)
    const r = settle(EN, "0", w)
    assert.equal(r.step, s, `rowInner=${w} 应落 ${s}`)
  }
  // 比 L3e 还窄：停在 L3e，不越界
  assert.equal(settle(EN, "0", 100).step, "3e")
})

test("来回拖宽度：阈值 −3 / +3 反复，级别只变一次；+9 才升回", () => {
  for (let i = 1; i < FOOTER_STEPS.length; i += 1) {
    const upper = FOOTER_STEPS[i - 1]!
    const lower = FOOTER_STEPS[i]!
    const edge = need(EN, upper)
    let { step } = settle(EN, upper, edge)
    assert.equal(step, upper)
    const seq: FooterStep[] = []
    for (let k = 0; k < 6; k += 1) {
      step = settle(EN, step, edge - 3).step
      seq.push(step)
      step = settle(EN, step, edge + 3).step
      seq.push(step)
    }
    assert.ok(seq.every((s) => s === lower), `${upper}/${lower} 临界：${seq.join(",")}`)
    step = settle(EN, step, edge + FOOTER_UPGRADE_HYSTERESIS_PX + 1).step
    assert.equal(step, upper)
  }
})

test("±4 抖动：在每个临界宽度来回 10 次，级别不变", () => {
  for (let i = 1; i < FOOTER_STEPS.length; i += 1) {
    const edge = need(EN, FOOTER_STEPS[i - 1]!)
    let { step } = settle(EN, "0", edge - 4)
    const first = step
    for (let k = 0; k < 10; k += 1) {
      step = settle(EN, step, k % 2 ? edge - 4 : edge + 4).step
      assert.equal(step, first)
    }
  }
})

test("内容抖动：同一宽度下 natural ±4，级别不变", () => {
  const w = need(EN, "2") + 5
  let { step } = settle(EN, "0", w)
  assert.equal(step, "2")
  for (let k = 0; k < 10; k += 1) {
    const d = k % 2 ? 4 : -4
    const c = table(FOOTER_STEPS.map((s) => EN[s]!.left + d), FOOTER_STEPS.map((s) => EN[s]!.right))
    step = settle(c, step, w).step
  }
  assert.equal(step, "2")
})

test("C4：升级只看目标级自己实测的宽 + 8，绝不用当前级去推", () => {
  // 当前级 L3b 很窄（chip 进了菜单），看起来有大量空余；目标级 L3a 实测放不下 → 不升
  const c: FooterWidthCache = { "3a": { left: 400, right: 190 }, "3b": { left: 100, right: 190 } }
  assert.deepEqual(pickFooterDensity({ cur: "3b", rowInner: 560, gapX: GAP, cache: c }), { next: "3b", probe: false })
  // L3b 附近 ±6：不来回
  let step: FooterStep = "3b"
  for (let k = 0; k < 10; k += 1) {
    step = pickFooterDensity({ cur: step, rowInner: 594 + (k % 2 ? 6 : -6), gapX: GAP, cache: c }).next
    assert.equal(step, "3b")
  }
  // 目标级缺缓存：探一级
  assert.deepEqual(pickFooterDensity({ cur: "3b", rowInner: 900, gapX: GAP, cache: { "3b": c["3b"] } }), { next: "3a", probe: true })
  // 探到的目标级只差不到 8：退回原级（回滞对探测同样生效）
  assert.deepEqual(
    pickFooterDensity({ cur: "3a", rowInner: 597, gapX: GAP, cache: c, upgradeProbeFrom: "3b" }),
    { next: "3b", probe: false }
  )
  assert.notEqual(
    pickFooterDensity({ cur: "3a", rowInner: 602, gapX: GAP, cache: c, upgradeProbeFrom: "3b" }).next,
    "3b"
  )
})

test("C4 回滞字面值边界（#228 跟进 ①）：升级 +7 不升 / +8 升 / +9 升；升级探测 +7 退回 / +8 留下——回滞就是 8，不是 7 也不是 9", () => {
  // 产品锁：升级须带 +8 回滞（≥8）。字面值钉住，常量被改成 7 / 9、只改一条路径、或 ≤ 改成 < 都会红。
  assert.equal(FOOTER_UPGRADE_HYSTERESIS_PX, 8)
  // L2 量过且远放不下：留在 L3a 时不会接着往 L2 探，结论只看 L3a↔L3b 这一道边界
  const c: FooterWidthCache = { "2": { left: 900, right: 190 }, "3a": { left: 400, right: 190 }, "3b": { left: 100, right: 190 } }
  const fit3a = need(c, "3a") // 目标级 L3a 刚好放下（不带回滞）的 rowInner
  // 1. 升级（目标级已量过）：只升一级，且只在 rowInner ≥ need + 8 时
  for (const [d, want] of [
    [7, "3b"],
    [8, "3a"],
    [9, "3a"]
  ] as const) {
    assert.deepEqual(
      pickFooterDensity({ cur: "3b", rowInner: fit3a + d, gapX: GAP, cache: c }),
      { next: want, probe: false },
      `升级 need+${d} → ${want}`
    )
  }
  // 2. 升级探测：上一步从 L3b 探到 L3a、L3a 刚量到；+7 退回原级 L3b，+8 留在 L3a
  assert.deepEqual(
    pickFooterDensity({ cur: "3a", rowInner: fit3a + 7, gapX: GAP, cache: c, upgradeProbeFrom: "3b" }),
    { next: "3b", probe: false },
    "探测 need+7 → 退回 3b"
  )
  for (const d of [8, 9]) {
    assert.deepEqual(
      pickFooterDensity({ cur: "3a", rowInner: fit3a + d, gapX: GAP, cache: c, upgradeProbeFrom: "3b" }),
      { next: "3a", probe: false },
      `探测 need+${d} → 留在 3a`
    )
  }
  // 3. 同样的边界经 hook 纯核心（footerDecide）走一遍：探测 → 当帧退回 / 留下
  for (const [d, want] of [
    [7, "3b"],
    [8, "3a"]
  ] as const) {
    const st = { cache: { "2": c["2"], "3b": c["3b"] } as FooterWidthCache, stepsUsed: 0 }
    assert.equal(footerDecide(st, { cur: "3b", rowInner: fit3a + d, gapX: GAP, ...c["3b"]! }), "3a", "缺缓存先探一级")
    const back = footerDecide(st, { cur: "3a", rowInner: fit3a + d, gapX: GAP, ...c["3a"]! })
    assert.equal(back ?? "3a", want, `footerDecide 探测 need+${d} → ${want}`)
  }
})

test("C1：chip 出现 / 消失（缓存全清后重新量），级别最多变一次", () => {
  const withChips = table(FOOTER_STEPS.map((s) => EN[s]!.left + (FOOTER_STEPS.indexOf(s) < 4 ? 305 : 0)), FOOTER_STEPS.map((s) => EN[s]!.right))
  const w = need(EN, "2") + FOOTER_UPGRADE_HYSTERESIS_PX + 2
  const before = settle(EN, "0", w).step
  assert.equal(before, "2")
  const after = settle(withChips, before, w)
  assert.equal(after.step, "3b")
  const back = settle(EN, after.step, w)
  assert.equal(back.step, "2")
})

test("步数上限：缓存全空从 L0 逐级探测，≤7 步收敛到 L3e", () => {
  const cache: FooterWidthCache = {}
  let step: FooterStep = "0"
  let steps = 0
  for (;;) {
    cache[step] = EN[step]
    const { next } = pickFooterDensity({ cur: step, rowInner: 120, gapX: GAP, cache })
    if (next === step) break
    step = next
    steps += 1
    assert.ok(steps <= FOOTER_MAX_STEPS)
  }
  assert.equal(step, "3e")
  assert.equal(steps, 7)
})

test("单调不动点：随机单调表，连续两次判定结果相同", () => {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let n = 0; n < 200; n += 1) {
    let l = 500 + rnd() * 400
    let r = 200 + rnd() * 120
    const left: number[] = []
    const right: number[] = []
    for (let i = 0; i < FOOTER_STEPS.length; i += 1) {
      left.push(l)
      right.push(r)
      l -= rnd() * 90
      if (i === 1) r -= rnd() * 100
    }
    const c = table(left, right)
    const w = 300 + rnd() * 900
    const a = settle(c, "0", w).step
    const b = settle(c, a, w)
    assert.equal(b.step, a)
    assert.equal(b.steps, 0)
  }
})

test("源码：底栏一行不折行；级别只在 row 上；不读 i18n.language / innerWidth / matchMedia", () => {
  const footer = read("composer-footer.tsx")
  // 现网三处 flex-wrap（row / 左组 / 右组）全部去掉；剩下的 flex-wrap 只在菜单小节（FooterOverflowSection）里
  assert.equal(footer.includes('"flex min-w-0 flex-wrap items-center justify-between'), false)
  assert.equal(footer.includes('"flex min-w-0 flex-wrap items-center gap-1.5"'), false)
  assert.equal(footer.includes('"ml-auto flex flex-wrap items-center justify-end gap-1"'), false)
  const main = footer.slice(0, footer.indexOf("function FooterOverflowSection"))
  assert.equal(/\bflex-wrap\b/.test(main), false)
  assert.ok(footer.includes('className="flex w-max shrink-0 flex-nowrap items-center gap-1.5 '))
  assert.ok(footer.includes("ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1"))
  assert.ok(footer.includes("group/footer flex min-w-0 flex-nowrap"))
  assert.equal(footer.split("data-footer-density=").length - 1, 1)
  assert.ok(footer.includes('compactVerticalSlack && "gap-y-0.5 pt-0 pb-2"'))
  // 左组裁切用 overflow-x-clip（不裁「已切换」浮签），且只在 L≥1 生效：L0 不命中任何裁切 class（1440 合成层零变化）
  assert.ok(footer.includes('cx("flex min-w-0 flex-1", FOOTER_LEFT_CLIP, FOOTER_LEFT_CLIP_FADE)'))
  assert.equal(/className="[^"]*overflow-x-clip/.test(footer), false)
  assert.equal(footer.includes("overflow-hidden"), false)
  const density = read("footer-density.ts")
  // 渐隐只是 mask、只在被裁时挂（hook 写 data-footer-clipped），不带任何宽度 / 内外边距类
  const fade = density.slice(density.indexOf("FOOTER_LEFT_CLIP_FADE ="), density.indexOf("export function footerStepIndex"))
  assert.match(fade, /group-data-\[footer-clipped\]\/footer:\[mask-image:/)
  assert.equal(/\b(w|min-w|max-w|px|mx|pl|pr|gap)-/.test(fade.replace(/\[mask-image:[^\]]*\]/, "")), false)
  const clip = density.slice(density.indexOf("FOOTER_LEFT_CLIP ="), density.indexOf("FOOTER_GE2_ONLY_INLINE ="))
  for (const n of [1, 2, 3]) assert.ok(clip.includes(`group-data-[footer-density=${n}]/footer:overflow-x-clip`))
  assert.equal(/(^|[\s"])(-mx-1|px-1|overflow-x-clip)([\s"]|$)/.test(clip.replace(/group-data-\[footer-density=[123]\]\/footer:\S+/g, "")), false)
  assert.equal(clip.includes("footer-density=0"), false)
  assert.equal(clip.includes("overflow-hidden"), false)
  assert.equal(/i18n\.language|innerWidth|matchMedia/.test(footer), false)
  const hook = read("use-footer-density.ts")
  assert.equal(/matchMedia|setInterval/.test(hook), false)
  // 选级只按实测行宽；窗宽只读一处，只喂给 footerSidebarIntent（按侧栏自己的 narrowSidebarWindow / onSidebarWidth 推它落定宽，#228 jojo），
  // 不进 footerDecide、不另写断点字面量；没有延时（setTimeout）
  assert.equal(hook.split("innerWidth").length - 1, 1)
  assert.match(hook, /const windowW = typeof window !== "undefined" \? window\.innerWidth : NaN\n\s+const intent = footerSidebarIntent\(\{/)
  assert.equal(/rowInner:[^\n]*windowW/.test(hook), false)
  assert.equal(/setTimeout|WAIT_MS|NARROW_SIDEBAR_PX|\b7[0-9]{2}\b/.test(hook), false)
  const densitySrc = read("footer-density.ts")
  assert.equal(/NARROW_SIDEBAR_PX|\b768\b|innerWidth|WAIT_MS/.test(densitySrc.replace(/\/\*\*[\s\S]*?\*\//g, "")), false)
  assert.ok(hook.includes("flushSync"))
  // RO 只看三个节点
  assert.equal(hook.split("ro.observe(").length - 1, 3)
})

test("溢出钮：点 aria-hidden + absolute；sr-only 常驻且不在 PopoverContent 内；原条目顺序不变", () => {
  const menu = read("composer-overflow-menu.tsx")
  const dot = menu.slice(menu.indexOf('data-testid="composer-overflow-dot"') - 200, menu.indexOf('data-testid="composer-overflow-dot"') + 400)
  assert.match(dot, /aria-hidden/)
  assert.match(dot, /absolute/)
  const content = menu.slice(menu.indexOf("<PopoverContent"), menu.indexOf("</PopoverContent>"))
  assert.equal(content.includes("composer-overflow-status"), false)
  assert.ok(menu.indexOf("composer-overflow-status") > menu.indexOf("</Popover>"))
  assert.ok(menu.includes('className="relative flex size-7 shrink-0'))
  const head = content.indexOf('t("chat.composerOverflow")')
  const goal = content.indexOf('<SessionGoalChip layout="menu" />')
  const hb = content.indexOf("<SessionHeartbeatForm />")
  const snap = content.indexOf("<AppsnapWindowPicker />")
  const section = content.indexOf("composer-overflow-footer-items")
  assert.ok(section >= 0 && section < head && head < goal && goal < hb && hb < snap)
  assert.equal(menu.includes("onPointerDownOutside"), false)
})

const VIEWS: Array<{ name: string; view: HostInjectBarView; mcp: number; skills: number; warn: boolean; shown: boolean }> = [
  { name: "hidden", view: { kind: "hidden" }, mcp: 0, skills: 0, warn: false, shown: false },
  { name: "enabled", view: { kind: "enabled", mcp: 1, skills: 2 }, mcp: 1, skills: 2, warn: false, shown: true },
  { name: "injected", view: { kind: "injected", mcp: 1, skills: 1, names: ["a", "b"], skipped: [] }, mcp: 1, skills: 1, warn: false, shown: true },
  {
    name: "injected 部分跳过",
    view: { kind: "injected", mcp: 1, skills: 0, names: ["a"], skipped: [{ name: "b", reason: "error" } as never] },
    mcp: 2,
    skills: 0,
    warn: false,
    shown: true
  },
  { name: "failed", view: { kind: "failed", skipped: [{ name: "b", reason: "error" } as never] }, mcp: 1, skills: 0, warn: true, shown: true },
  { name: "unsupported mcp", view: { kind: "unsupported", mcp: true, skills: false }, mcp: 1, skills: 0, warn: true, shown: true },
  { name: "unsupported skills", view: { kind: "unsupported", mcp: false, skills: true }, mcp: 0, skills: 2, warn: true, shown: true },
  { name: "unsupported both", view: { kind: "unsupported", mcp: true, skills: true }, mcp: 1, skills: 2, warn: true, shown: true }
]

test("黄点 parity：L0–L2 芯片是否黄 == L3 点是否黄（HostInject 全部 8 态）", () => {
  const bar = read("host-inject/host-inject-bar.tsx")
  assert.match(bar, /const unsupported = hostInjectWarns\(view\)/)
  for (const row of VIEWS) {
    const hi = hostInjectChipShown(row.view, row.mcp, row.skills)
    assert.equal(hi, row.shown, `${row.name} 芯片是否画`)
    const chipYellow = hi && hostInjectWarns(row.view)
    const dotTone = footerDotTone({ cu: false, pb: false, hi, view: row.view })
    assert.equal(chipYellow, row.warn, `${row.name} 芯片黄`)
    assert.equal(dotTone === "warn", chipYellow, `${row.name} 点黄 == 芯片黄`)
    assert.equal(dotTone, row.shown ? (row.warn ? "warn" : "accent") : "none", row.name)
    // 再叠桌面 chip：黄仍优先
    assert.equal(footerDotTone({ cu: true, pb: true, hi, view: row.view }), row.warn ? "warn" : "accent")
  }
  assert.equal(footerDotTone({ cu: false, pb: false, hi: false, view: { kind: "hidden" } }), "none")
  assert.equal(footerDotTone({ cu: true, pb: false, hi: false, view: { kind: "hidden" } }), "accent")
})

test("零新文案：底栏 / 溢出菜单 / 新 hook 里的 t() key 在中英文 catalog 都已存在", () => {
  const src = ["composer-footer.tsx", "composer-overflow-menu.tsx", "use-footer-optional-chips.ts", "footer-dot-tone.ts"].map(read).join("\n")
  const keys = [...src.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]!)
  assert.ok(keys.length > 5)
  for (const key of keys) {
    const [ns, ...rest] = key.split(".")
    if (ns !== "chat") continue
    const path = rest.join(".")
    const get = (o: Record<string, unknown>) => path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], o)
    assert.equal(typeof get(zhChat as never), "string", `zh ${key}`)
    assert.equal(typeof get(enChat as never), "string", `en ${key}`)
  }
})

/** 照 hook 的驱动方式跑 footerDecide：一次 RO 回调清步数 → 判 → 写 → 布局 effect 再判，直到不动或步数用完。 */
function driveTick(st: { cache: FooterWidthCache; stepsUsed: number; upgradeProbeFrom?: FooterStep }, cur: FooterStep, rowInner: number, widths: (s: FooterStep) => { left: number; right: number }) {
  st.stepsUsed = 0
  let step = cur
  let moves = 0
  for (let guard = 0; guard < 50; guard += 1) {
    const w = widths(step)
    const next = footerDecide(st, { cur: step, rowInner, gapX: 4, ...w })
    if (next === null) break
    step = next
    moves += 1
  }
  return { step, moves }
}

test("hook 驱动（footerDecide）：拖宽 / 内容抖动下每次回调 ≤7 步、必收敛；同宽再触发一次不动（无跨帧循环）", () => {
  const need = [940, 840, 780, 740, 700, 660, 630, 600]
  for (const jitter of [0, 3]) {
    let tick = 0
    const widths = (s: FooterStep) => {
      const base = need[FOOTER_STEPS.indexOf(s)]!
      const j = jitter ? ((tick + FOOTER_STEPS.indexOf(s)) % 2) * jitter : 0
      return { left: base - 200 + j, right: 196 }
    }
    const st = { cache: {} as FooterWidthCache, stepsUsed: 0 }
    let step: FooterStep = "0"
    const drag: number[] = []
    for (let w = 1100; w >= 560; w -= 7) drag.push(w)
    for (let w = 560; w <= 1100; w += 5) drag.push(w)
    for (let k = 0; k < 40; k += 1) drag.push(700 + ((k * 37) % 120) - 60)
    for (const rowInner of drag) {
      tick += 1
      const a = driveTick(st, step, rowInner, widths)
      assert.ok(a.moves <= FOOTER_MAX_STEPS, `rowInner=${rowInner} moves=${a.moves}`)
      step = a.step
      // 同一宽度、同一内容再触发一次 RO：不再动（不会 A→B→A 跨帧打转）
      const b = driveTick(st, step, rowInner, widths)
      assert.equal(b.step, step, `rowInner=${rowInner} 二次触发又动了 ${step}→${b.step}`)
      // 落定级要么放得下，要么已是最末级
      const w = widths(step)
      assert.ok(w.left + w.right + 4 - 0.5 <= rowInner || step === "3e", `rowInner=${rowInner} step=${step} 放不下`)
    }
  }
})

test("hook 驱动：升级探测放不下时当帧退回、不留在探测级；缓存清空（C1）后最多一次探测往返", () => {
  const need: Record<FooterStep, number> = { "0": 900, "1": 800, "2": 700, "3a": 680, "3b": 660, "3c": 640, "3d": 620, "3e": 600 }
  const widths = (s: FooterStep) => ({ left: need[s] - 200, right: 196 })
  const st = { cache: {} as FooterWidthCache, stepsUsed: 0 }
  let { step } = driveTick(st, "0", 805, widths)
  assert.equal(step, "1")
  // 宽到 805（L0 要 900+8）：清缓存后从 L1 探 L0 → 放不下 → 同一回调里退回 L1
  st.cache = {}
  const r = driveTick(st, step, 805, widths)
  assert.equal(r.step, "1")
  assert.ok(r.moves <= 2, `moves=${r.moves}`)
})

test("L2 尺寸契约（产品 §L2 / luna §16）：思考强度 / ThoughtChip 走 28px 图标钮；运行点 L≥2 槽 w-3（12）居中、点本身仍是现网 6px 不放大", () => {
  const footer = read("composer-footer.tsx")
  assert.match(footer, /<span data-testid="composer-run-dot" className="size-1\.5 rounded-full bg-accent-500 animate-pulse" \/>/)
  assert.doesNotMatch(footer, /footer-density=[23]\]\/footer:size-3/)
  assert.match(footer, /data-testid="composer-run-chip"[\s\S]*?group-data-\[footer-density=2\]\/footer:w-3 group-data-\[footer-density=2\]\/footer:justify-center/)
  assert.match(footer, /data-testid="composer-run-chip"[\s\S]*?group-data-\[footer-density=2\]\/footer:w-3/)
  const reasoning = readFileSync(join(dir, "..", "reasoning-effort-toggle.tsx"), "utf8")
  assert.match(reasoning, /compact\s*\?\s*cx\([^)]*FOOTER_GE2_ICON_BUTTON\)/)
  const thought = read("thinking/composer-thinking-chrome.tsx")
  assert.match(thought, /FOOTER_GE2_ICON_BUTTON/)
})

test("hook 驱动：步数恰好在升级探测级用完时仍当帧退回（不停在不带 +8 的探测级）", () => {
  // L1 只在不带回滞时放得下（need 595.5，rowInner 597），上面各级缓存都被清（如计量文字变宽）
  const need: Record<FooterStep, number> = { "0": 760, "1": 595.5, "2": 440, "3a": 410, "3b": 400, "3c": 390, "3d": 380, "3e": 370 }
  const widths = (s: FooterStep) => ({ left: need[s] - 128 - 4, right: 128 })
  for (const used of [0, 1, 2, 5, 6, 7]) {
    const st = { cache: { "3e": widths("3e") } as FooterWidthCache, stepsUsed: 0 }
    // 先把步数用到 used，再从 3e 起跳到 597
    let step: FooterStep = "3e"
    st.stepsUsed = used
    for (let guard = 0; guard < 50; guard += 1) {
      const next = footerDecide(st, { cur: step, rowInner: 597, gapX: 4, ...widths(step) })
      if (next === null) break
      step = next
    }
    assert.notEqual(step, "1", `used=${used}: 停在探测级 L1`)
    // 后续 RO 回调（清步数）继续收敛到 L2，且不再动
    const a = driveTick(st, step, 597, widths)
    assert.equal(a.step, "2", `used=${used}`)
    assert.equal(driveTick(st, a.step, 597, widths).step, "2")
    assert.equal(driveTick(st, "2", 593, widths).step, "2")
    assert.equal(driveTick(st, "2", 601, widths).step, "2")
  }
})

test("换级瞬间冻结底栏后代过渡：hook 挂 data-footer-switching、两帧后摘掉；row 只在该属性下 transition-none", () => {
  const hook = read("use-footer-density.ts")
  assert.match(hook, /setAttribute\("data-footer-switching", ""\)/)
  assert.match(hook, /removeAttribute\("data-footer-switching"\)/)
  // 所有写 step 的路径都走 commit（先冻结再写）
  assert.equal((hook.match(/setStep\(/g) ?? []).length, 2, "setStep only inside commit")
  const footer = read("composer-footer.tsx")
  assert.match(footer, /\[&\[data-footer-switching\]_\*\]:transition-none/)
  assert.doesNotMatch(footer, /group\/footer[^"]*(?<!\]_\*\]:)\btransition-none/)
})

test("#228 M1：3a / 3b 交界、桌面 chip 开着，连续改 contentKey（轮次开始 / 结束）级别不变、不落中间态", () => {
  // 3a 左组带桌面 chip（+40）；3b 起三颗 chip 进菜单。右组 196，gap 4。
  const CHIP = 40
  const left: Record<FooterStep, number> = { "0": 900, "1": 800, "2": 700, "3a": 500, "3b": 500, "3c": 470, "3d": 440, "3e": 410 }
  const withChip = (chipFirstFrame: () => boolean) => (s: FooterStep) => ({
    left: left[s] + (FOOTER_STEPS.indexOf(s) < FOOTER_STEPS.indexOf("3b") && chipFirstFrame() ? CHIP : 0),
    right: 196
  })
  // 交界带：3a（带 chip）+8 放不下，3b 放得下；3a 若漏量 chip 则 +8 放得下。
  for (let rowInner = 708; rowInner < 500 + CHIP + 196 + 4 + 8; rowInner += 4) {
    // 共享读：重挂首帧就是已知值（chip 在），探测量到真实宽度。
    const st = { cache: {} as FooterWidthCache, stepsUsed: 0 }
    let step = driveTick(st, "3b", rowInner, withChip(() => true)).step
    assert.equal(step, "3b", `rowInner=${rowInner} 起始级`)
    for (let turn = 0; turn < 10; turn += 1) {
      st.cache = {} // contentKey 变（running 开始 / 结束）→ 缓存全清，从当前级重新量、探 3a
      const r = driveTick(st, step, rowInner, withChip(() => true))
      assert.equal(r.step, "3b", `rowInner=${rowInner} 第 ${turn + 1} 轮落到 ${r.step}`)
      assert.ok(r.moves <= 2, `rowInner=${rowInner} 探测往返应在同一回调内（moves=${r.moves}）`)
      step = r.step
    }
    // 对照（改前）：重挂首帧 chip 缺席 → 探测误判放得下，留在 3a 被画出来（之后 IPC 回来再降回 3b = 闪一次）。
    const old = { cache: {} as FooterWidthCache, stepsUsed: 0 }
    const landed = driveTick(old, "3b", rowInner, withChip(() => false)).step
    assert.equal(landed, "3a", `rowInner=${rowInner} 对照应复现误升`)
  }
})

test("#228 M1：底栏可选 chip 与 ComputerUseChip 共用同一个共享读 hook（模块态初值，非 useState(false)）", () => {
  const hook = readFileSync(join(dir, "../../../hooks/use-computer-use-enabled.ts"), "utf8")
  assert.match(hook, /useSyncExternalStore\(subscribe, getSnapshot/)
  assert.doesNotMatch(hook, /useState\(false\)/)
  assert.match(hook, /if \(known !== null \|\| inflight \|\| !hasIde\(\)\) return/)
  assert.doesNotMatch(hook, /builtinTools\.(toggle|set)/)
  for (const f of ["computer-use-chip.tsx", "use-footer-optional-chips.ts"]) {
    assert.match(read(f), /from "@renderer\/hooks\/use-computer-use-enabled"/, f)
  }
})

test("C4 回滞（jojo #228 产品门）：L0→L1 … L3d→L3e 每个交界，1px 拖窄降级点与拖宽升级点之差都 ≥8", () => {
  // 三套宽度模型（各级 left + right + gap 的实测总需宽）：间距宽 / 间距 2px / 相邻两级等宽（3a=3b，M1 那种）。
  const models: Record<string, number[]> = {
    spaced: [940, 880, 820, 760, 700, 640, 580, 520],
    tight: [700, 698, 696, 694, 692, 690, 688, 686],
    equal: [900, 800, 700, 500, 500, 470, 440, 410]
  }
  for (const [name, need] of Object.entries(models)) {
    const widths = (s: FooterStep) => ({ left: need[FOOTER_STEPS.indexOf(s)]! - 4 - 196, right: 196 })
    const st = { cache: {} as FooterWidthCache, stepsUsed: 0 }
    let step: FooterStep = "0"
    const hi = need[0]! + 40
    const lo = need[need.length - 1]! - 40
    const down: number[] = []
    const up: number[] = []
    for (let w = hi; w >= lo; w -= 1) {
      const before = footerStepIndex(step)
      step = driveTick(st, step, w, widths).step
      const after = footerStepIndex(step)
      for (let k = before; k < after; k += 1) down[k] = w
    }
    for (let w = lo; w <= hi; w += 1) {
      const before = footerStepIndex(step)
      step = driveTick(st, step, w, widths).step
      const after = footerStepIndex(step)
      for (let k = after; k < before; k += 1) up[k] = w
    }
    assert.equal(step, "0", `${name}: 拖回最宽应回到 L0`)
    for (let k = 0; k < FOOTER_MAX_STEPS; k += 1) {
      const label = `${name} L${FOOTER_STEPS[k]}↔L${FOOTER_STEPS[k + 1]}`
      assert.ok(down[k] != null && up[k] != null, `${label}: 两个方向都应经过`)
      assert.ok(up[k]! - down[k]! >= FOOTER_UPGRADE_HYSTERESIS_PX, `${label}: 降 ${down[k]} / 升 ${up[k]}，差 ${up[k]! - down[k]!} < 8`)
    }
  }
})

test("#228 产品门 B1（jojo）：底栏可选 chip 不收缩、不折行（桌面 / 更倾向桌面 / 扩展外壳 / 附件钮 shrink-0 + whitespace-nowrap；左组 shrink-0）——否则 chip 被 flex 挤扁、左组实测宽不溢出，选级看不见", () => {
  const chipClass = (src: string, testid: string) => {
    const m = src.match(new RegExp(`data-testid="${testid}"\\s*\\n\\s*className="([^"]+)"`))
    assert.ok(m, `${testid} className 应为静态字符串`)
    return m![1]!.split(/\s+/)
  }
  for (const [file, testid] of [
    ["computer-use-chip.tsx", "computer-use-chip"],
    ["preset-desktop-bias-pill.tsx", "preset-desktop-bias-pill"]
  ] as const) {
    const cls = chipClass(read(file), testid)
    assert.ok(cls.includes("shrink-0"), `${testid} 必须 shrink-0`)
    assert.ok(cls.includes("whitespace-nowrap"), `${testid} 必须 whitespace-nowrap`)
    assert.ok(!cls.some((c) => /^(shrink|flex-1|flex-auto|truncate|min-w-0)$/.test(c)), `${testid} 不得可收缩 / 截断`)
  }
  assert.match(read("host-inject/host-inject-bar.tsx"), /<div className="shrink-0 whitespace-nowrap" data-testid="host-inject-bar"/)
  // 附件钮（luna H1：被压到 20–22，应 30）
  assert.match(read("composer-attach-menu.tsx"), /className="flex size-7\.5 shrink-0 [^"]*whitespace-nowrap"/)
  // 左组本身不收缩：宽 = 各项自然宽之和，选级量到的就是自然宽（放不下 → 降级，而不是 flex 去压其中某项）
  assert.match(read("composer-footer.tsx"), /data-testid="composer-footer-left"\s+className="flex w-max shrink-0 flex-nowrap/)
})

test("#228 luna S1：「回到底部」浮钮只在对话区放得下整颗（bottom-4 16 + size-9 36 + 上沿 8）时渲染；只读视口高", () => {
  const thread = readFileSync(join(dir, "..", "ai-chat-thread.tsx"), "utf8")
  assert.match(thread, /const SCROLL_BUTTON_MIN_VIEWPORT_PX = 16 \+ 36 \+ 8/)
  assert.match(thread, /<FittedConversationScrollButton \/>/)
  assert.doesNotMatch(thread, /^\s*<ConversationScrollButton \/>\s*$/m)
  assert.match(thread, /fits \? <ConversationScrollButton \/> : null/)
  const fn = thread.slice(thread.indexOf("function FittedConversationScrollButton"), thread.indexOf("function useSendScrollTick"))
  assert.doesNotMatch(fn, /scrollTo|scrollTop\s*=|useChatStore|setState\(/, "只读高度，不改滚动 / store")
})

// —— #228 H2（luna sbx2 / jojo 768 拖窗）：运行中跨窄窗断点不回弹 ——

/** zh + CU 运行中实测各级左组宽（right 144，gap-1.5）。 */
const H2_LEFT: Record<FooterStep, number> = { "0": 700, "1": 520, "2": 444, "3a": 412.8, "3b": 290.4, "3c": 264, "3d": 230, "3e": 196 }
const H2_GAP = 6
const h2Widths = (s: FooterStep) => ({ left: H2_LEFT[s], right: 144 })

type H2Frame = { inner: number; shift: number; sinceLastMs: number }
/**
 * 照 use-footer-density 的驱动方式逐帧跑：RO 回调（按目标宽判 → 闸门决定提不提交）→ 提交后布局 effect 连判到不动；
 * 串结束两帧后尾随复核（侧栏已停，不过闸）。返回每帧画出来的级。gate=false 即修前（照单全收、按当前宽判）。
 */
function h2Run(start: FooterStep, startInner: number, frames: H2Frame[], gate: boolean) {
  const st = { cache: {} as FooterWidthCache, stepsUsed: 0 } as { cache: FooterWidthCache; stepsUsed: number; upgradeProbeFrom?: FooterStep }
  const settle = (cur: FooterStep, rowInner: number) => {
    let step = cur
    for (let g = 0; g < 50; g += 1) {
      const next = footerDecide(st, { cur: step, rowInner, gapX: H2_GAP, ...h2Widths(step) })
      if (next === null) break
      step = next
    }
    return step
  }
  st.stepsUsed = 0
  let step = settle(start, startInner)
  let lastInner: number | null = startInner
  const painted: FooterStep[] = []
  for (const f of frames) {
    st.stepsUsed = 0
    const rowInner = gate ? footerTargetInner(f.inner, f.shift) : f.inner
    const w = h2Widths(step)
    const next = footerDecide(st, { cur: step, rowInner, gapX: H2_GAP, ...w })
    if (next) {
      const ok = !gate || footerResizeGate({ cur: step, next, inner: f.inner, lastInner, sinceLastMs: f.sinceLastMs, shift: f.shift, overflow: w.left + H2_GAP + w.right - f.inner }) === "commit"
      if (ok) step = settle(next, rowInner)
    }
    lastInner = f.inner
    painted.push(step)
  }
  st.stepsUsed = 0
  const final = settle(step, frames.at(-1)!.inner)
  painted.push(final)
  return { painted, final }
}
const dirChanges = (seq: FooterStep[]) => {
  let n = 0
  let dir = 0
  for (let i = 1; i < seq.length; i += 1) {
    const d = Math.sign(footerStepIndex(seq[i]!) - footerStepIndex(seq[i - 1]!))
    if (!d) continue
    if (dir && d !== dir) n += 1
    dir = d
  }
  return n
}
/** 同宽静态级：从远处（更窄 / 更宽）拖过来落定，两种回滞结果之一。 */
function h2Static(inner: number) {
  const out = new Set<FooterStep>()
  for (const from of [inner - 150, inner + 150]) {
    const st = { cache: {} as FooterWidthCache, stepsUsed: 0 }
    let step: FooterStep = "0"
    for (const w of [from, inner]) {
      for (let k = 0; k < 4; k += 1) step = driveTickGap(st, step, w).step
    }
    out.add(step)
  }
  return out
}
function driveTickGap(st: { cache: FooterWidthCache; stepsUsed: number; upgradeProbeFrom?: FooterStep }, cur: FooterStep, rowInner: number) {
  st.stepsUsed = 0
  let step = cur
  for (let g = 0; g < 50; g += 1) {
    const next = footerDecide(st, { cur: step, rowInner, gapX: H2_GAP, ...h2Widths(step) })
    if (next === null) break
    step = next
  }
  return { step }
}

/** sbx2 实测帧宽：窗 776→764（侧栏开始收，第一帧先窄 8px），聊天区最后落到 592。 */
const COLLAPSE_INNER = [372, 379, 391, 410, 440, 472, 502, 525, 543, 556, 567, 575, 581, 586, 589, 591, 592]
/** 窗 764→776（侧栏开始展，第一帧先宽 12px），聊天区最后落到 384。 */
const EXPAND_INNER = [604, 565, 537, 503, 470, 440, 420, 405, 395, 389, 386, 384]
const h2Frames = (inners: number[], target: number): H2Frame[] =>
  inners.map((inner, i) => ({ inner, shift: i === 0 || i === inners.length - 1 ? 0 : target - inner, sinceLastMs: i === 0 ? 1000 : 16 }))

test("#228 H2：运行中拖窗跨 768（侧栏自动收 / 展）——级别逐帧单向、终态 = 同宽静态级；修前会回弹", () => {
  const cases = [
    { name: "776→764 收", start: 380, frames: h2Frames(COLLAPSE_INNER, 592) },
    { name: "764→776 展", start: 592, frames: h2Frames(EXPAND_INNER, 384) },
    // jojo 单跳 800→740：窗口一次窄 60px，侧栏下一帧才收
    { name: "800→740 单跳", start: 412, frames: h2Frames([352, 360, 380, 420, 470, 510, 540, 560, 572, 578, 580], 580) }
  ]
  for (const c of cases) {
    const startStep = h2Run("0", c.start, [{ inner: c.start, shift: 0, sinceLastMs: 1000 }], true).final
    const fixed = h2Run(startStep, c.start, c.frames, true)
    assert.equal(dirChanges([startStep, ...fixed.painted]), 0, `${c.name} 修后回弹：${[startStep, ...fixed.painted].join(" ")}`)
    assert.ok(h2Static(c.frames.at(-1)!.inner).has(fixed.final), `${c.name} 终态 ${fixed.final} ≠ 同宽静态 ${[...h2Static(c.frames.at(-1)!.inner)].join("/")}`)
    const before = h2Run(startStep, c.start, c.frames, false)
    assert.ok(dirChanges([startStep, ...before.painted]) > 0, `${c.name} 修前也单向了？测试没咬住：${[startStep, ...before.painted].join(" ")}`)
  }
})

test("#228 H2：侧栏点开 / 收起（1100–800）——挤窄时按目标宽一步到终态级、全程不越出行宽；推宽时只升不降", () => {
  // 侧栏展开把聊天区从 600 挤到 380：第一帧就落到 380 的级，之后每帧都放得下（左组不越出裁切壳）
  const inners = [600, 590, 560, 520, 480, 450, 425, 405, 392, 385, 381, 380]
  const frames = inners.map((inner, i) => ({ inner, shift: i === inners.length - 1 ? 0 : 380 - inner, sinceLastMs: i === 0 ? 1000 : 16 }))
  const start = h2Run("0", 600, [{ inner: 600, shift: 0, sinceLastMs: 1000 }], true).final
  const r = h2Run(start, 600, frames, true)
  assert.equal(dirChanges([start, ...r.painted]), 0)
  r.painted.slice(0, -1).forEach((s, i) => {
    const w = h2Widths(s)
    assert.ok(w.left + H2_GAP + w.right - 0.5 <= frames[i]!.inner || s === "3e", `第 ${i} 帧 ${s} 放不下 ${frames[i]!.inner}`)
  })
  // 收起：聊天区 380→600，只升
  const back = inners.slice().reverse()
  const r2 = h2Run(r.final, 380, back.map((inner, i) => ({ inner, shift: i === back.length - 1 ? 0 : 600 - inner, sinceLastMs: i === 0 ? 1000 : 16 })), true)
  assert.equal(dirChanges([r.final, ...r2.painted]), 0)
})

test("#228 H2：footerResizeGate / footerSidebarShift / footerTargetInner 规则", () => {
  const g = (o: Partial<Parameters<typeof footerResizeGate>[0]>) =>
    footerResizeGate({ cur: "3d", next: "3e", inner: 372, lastInner: 380, sinceLastMs: 16, ...o })
  // 侧栏正把聊天区推宽：只升不降
  assert.equal(g({ shift: 200 }), "defer")
  assert.equal(g({ shift: 200, next: "3c" }), "commit")
  // 侧栏正把聊天区挤窄：按目标宽选的级直接提交
  assert.equal(g({ shift: -200 }), "commit")
  assert.equal(g({ shift: -200, next: "3c" }), "commit")
  // 侧栏不动：串首先不换级；但大跨度拉窄（当前级超出 > FOOTER_RESIZE_DIP_PX）照常降级
  assert.equal(g({ sinceLastMs: FOOTER_RESIZE_BURST_GAP_MS + 1, overflow: 8 }), "defer")
  assert.equal(g({ sinceLastMs: FOOTER_RESIZE_BURST_GAP_MS + 1, overflow: FOOTER_RESIZE_DIP_PX + 1 }), "commit")
  assert.equal(g({ sinceLastMs: FOOTER_RESIZE_BURST_GAP_MS + 1, next: "3c", inner: 400 }), "defer")
  // 串内：与宽度走向相反的换级不提交，同向照常
  assert.equal(g({ inner: 390, lastInner: 380 }), "defer")
  assert.equal(g({ inner: 370, lastInner: 380 }), "commit")
  assert.equal(g({ next: "3c", inner: 370, lastInner: 380 }), "defer")
  assert.equal(g({ next: "3c", inner: 390, lastInner: 380 }), "commit")
  // 行宽没变（内容引起的 RO）、首次：照常
  assert.equal(g({ inner: 380, lastInner: 380, sinceLastMs: 5000 }), "commit")
  assert.equal(g({ lastInner: null }), "commit")
  assert.equal(footerSidebarShift(null), 0)
  assert.equal(footerSidebarShift({ current: 280, target: 60, overlay: false }), 220)
  assert.equal(footerSidebarShift({ current: 60, target: 280, overlay: false }), -220)
  assert.equal(footerSidebarShift({ current: 60, target: 280, overlay: true }), 0)
  assert.equal(footerSidebarShift({ current: 280.3, target: 280, overlay: false }), 0)
  assert.equal(footerSidebarShift({ current: 280, target: Number.NaN, overlay: false }), 0)
  assert.equal(footerTargetInner(600, -220), 380)
  assert.equal(footerTargetInner(380, 220), 380) // 点开关收起：逐级升
  assert.equal(footerTargetInner(380, 220, true), 600) // 窄窗自动收起：按目标宽
  assert.equal(footerTargetInner(380, 0, true), 380)
})

/**
 * jojo M1 慢拖（每 2px 停 200ms）跨 768：断点上方侧栏目标仍是展开，按当前宽度落静态级（768 落 3e 是该宽静态级，允许）；
 * 766 那一下侧栏目标已是收起（narrowSidebarWindow），而 nav-card 还没渲染 / 动画还没开始、聊天区比 768 时还窄 2px。
 * 修前（e9034ae0：目标宽读 DOM，shift 0；推宽也不按目标宽）：766 停在 / 降到 3e 两三帧，再被推宽回 3d→…→2。
 * 修后：footerSidebarIntent 按窗宽 + 侧栏自己的判断推目标态 → shift > 0，footerTargetInner 按收起后的宽度选级，
 * 766 第一帧就落到「当前窗宽 + 侧栏目标态」的静态级，iw < 768 不出现 3e；停多久都一样（不靠时间）。
 */
type SweepFrame = H2Frame & { dwell: boolean; ahead?: boolean }
function h2Sweep(start: FooterStep, startInner: number, frames: SweepFrame[], opts: { legacyUp?: boolean } = {}) {
  const st = { cache: {} as FooterWidthCache, stepsUsed: 0 } as { cache: FooterWidthCache; stepsUsed: number; upgradeProbeFrom?: FooterStep }
  const settle = (cur: FooterStep, rowInner: number) => {
    let step = cur
    for (let g = 0; g < 50; g += 1) {
      const next = footerDecide(st, { cur: step, rowInner, gapX: H2_GAP, ...h2Widths(step) })
      if (next === null) break
      step = next
    }
    return step
  }
  let step = start
  let lastInner: number | null = startInner
  const painted: FooterStep[] = []
  for (const f of frames) {
    st.stepsUsed = 0
    // legacyUp：修前接法，推宽（shift > 0）不按目标宽选级
    const rowInner = opts.legacyUp && f.shift > 0 ? f.inner : footerTargetInner(f.inner, f.shift, f.ahead)
    const w = h2Widths(step)
    const next = footerDecide(st, { cur: step, rowInner, gapX: H2_GAP, ...w })
    if (next) {
      const gate = footerResizeGate({ cur: step, next, inner: f.inner, lastInner, sinceLastMs: f.sinceLastMs, shift: f.shift, overflow: w.left + H2_GAP + w.right - f.inner })
      if (gate === "commit") step = settle(next, rowInner)
    }
    lastInner = f.inner
    painted.push(step)
    // 尾随复核（停够两帧）：侧栏推宽 / 即将收起（shift > 0）时只升不降
    if (f.dwell) {
      st.stepsUsed = 0
      const t = settle(step, rowInner)
      if (!(f.shift > 0 && footerStepIndex(t) > footerStepIndex(step))) step = t
      painted.push(step)
    }
  }
  st.stepsUsed = 0
  const final = settle(step, frames.at(-1)!.inner)
  painted.push(final)
  return { painted, final }
}

/** 按 hook 的接法，用 footerSidebarIntent 给一串窗宽算每一下的 shift（侧栏 DOM 现宽一律 280 停靠，直到动画开始）。 */
function intentShifts(windows: number[]) {
  const state = initSidebarCollapse(false, false)
  return windows.map((w) => 280 - footerSidebarIntent({ state, windowW: w, expandedPx: 280, collapsedPx: 60 }).target)
}

test("#228 H2（jojo M1 慢拖）：每 2px 停住跨 768——断点上方按同宽静态级，iw < 768 第一帧就落侧栏收起后的静态级、不出现 3e", () => {
  const collapse = [376, 383, 395, 414, 444, 476, 506, 529, 547, 560, 571, 579, 585, 590, 593, 594]
  const shifts = intentShifts([772, 770, 768, 766])
  assert.deepEqual(shifts, [0, 0, 0, 220], "断点上方侧栏目标仍展开；766 目标已收起（不等 DOM）")
  const above: SweepFrame[] = [
    { inner: 386, shift: shifts[0]!, sinceLastMs: 200, dwell: true }, // 772
    { inner: 384, shift: shifts[1]!, sinceLastMs: 200, dwell: true }, // 770
    { inner: 378, shift: shifts[2]!, sinceLastMs: 200, dwell: true } // 768：3d 放不下了 → 静态 3e
  ]
  // 766：第一帧侧栏 DOM 还停靠（inner 比 768 还窄 2px），随后动画推宽
  const tail: SweepFrame[] = collapse.map((inner, i) => ({ inner, shift: i === collapse.length - 1 ? 0 : 594 - inner, sinceLastMs: i === 0 ? 200 : 16, dwell: i === 0 || i === collapse.length - 1, ahead: true }))
  const start = h2Run("0", 388, [{ inner: 388, shift: 0, sinceLastMs: 1000 }], true).final
  assert.equal(start, "3d")
  const fixed = h2Sweep(start, 388, [...above, ...tail])
  const abovePainted = fixed.painted.slice(0, above.length * 2)
  const tailPainted = fixed.painted.slice(above.length * 2)
  // 断点上方：每步停够（尾随复核）后 = 同宽静态级
  for (let k = 0; k < above.length; k += 1) assert.ok(h2Static(above[k]!.inner).has(abovePainted[k * 2 + 1]!), `${above[k]!.inner} 静态：${abovePainted.join(" ")}`)
  assert.equal(abovePainted.at(-1), "3e", "768 静态 3e（允许）")
  // 跨过断点：第一帧起 = 收起后静态级，全程不再变、不出现 3e
  assert.equal(tailPainted.includes("3e"), false, `iw<768 不该有 3e：${tailPainted.join(" ")}`)
  assert.ok(h2Static(594).has(tailPainted[0]!), `766 第一帧 ${tailPainted[0]} = 收起后静态级`)
  assert.equal(new Set(tailPainted).size, 1, `跨过断点后一步到位：${tailPainted.join(" ")}`)
  assert.ok(h2Static(594).has(fixed.final), `终态 ${fixed.final}`)
  // 修前（侧栏目标读 DOM = shift 0 那一帧；推宽不按目标宽）：766 那几帧还是 3e
  const before = h2Sweep(start, 388, [...above, ...tail.map((f, i) => (i === 0 ? { ...f, shift: 0 } : f))], { legacyUp: true })
  assert.ok(before.painted.slice(above.length * 2).includes("3e"), `修前应复现 iw766 的 3e：${before.painted.join(" ")}`)
  // 反向慢拖 760→776：766→768 侧栏展开把聊天区挤窄 → 按目标宽一步落静态级（shift < 0），之后只随宽度升
  assert.deepEqual(intentShifts([766, 768, 770]), [220, 0, 0])
})

test("#228 H2：footerSidebarIntent —— 只按窗宽 + 侧栏自己的判断（narrowSidebarWindow / onSidebarWidth）推目标态，不另写断点", () => {
  const docked = initSidebarCollapse(false, false)
  const i = (o: Partial<Parameters<typeof footerSidebarIntent>[0]>) =>
    footerSidebarIntent({ state: docked, windowW: 900, expandedPx: 280, collapsedPx: 60, ...o })
  const B = NARROW_SIDEBAR_PX
  assert.equal(narrowSidebarWindow(B - 1), true)
  assert.equal(narrowSidebarWindow(B), false)
  assert.deepEqual(i({}), { target: 280, ahead: false }) // 宽窗停靠展开
  assert.deepEqual(i({ windowW: B }), { target: 280, ahead: false }) // 768 不算窄窗
  assert.deepEqual(i({ windowW: B - 2 }), { target: 60, ahead: true }) // 进窄窗：侧栏自动收起（React 还没渲染也照推）→ 按目标宽
  assert.deepEqual(i({ windowW: Number.NaN }), { target: 280, ahead: false }) // 无窗宽：只看 store 现态
  // 用户手动收起（偏好）：恒为收起
  const pref = onSidebarManual(docked, true)
  assert.deepEqual(i({ state: pref, windowW: B + 100 }), { target: 60, ahead: false }) // 点开关收起：不抢先（逐级升）
  assert.deepEqual(i({ state: pref, windowW: Number.NaN }), { target: 60, ahead: false })
  // 窄窗浮层（偏好展开 + 窄窗里临时打开）：只占轨道宽；回宽窗变停靠展开
  const narrow = initSidebarCollapse(false, true)
  const peek = onSidebarManual(narrow, false)
  assert.deepEqual(i({ state: peek, windowW: B - 10 }), { target: 60, ahead: true }) // 浮层不占主区（shift 0），ahead 无影响
  assert.deepEqual(i({ state: peek, windowW: B }), { target: 280, ahead: false })
  assert.deepEqual(i({ state: narrow, windowW: B }), { target: 280, ahead: false })
  assert.deepEqual(i({ state: narrow, windowW: B - 10 }), { target: 60, ahead: true }) // 自动收起已生效（store 已跟上）仍按目标宽
  const g = (o: Partial<Parameters<typeof footerResizeGate>[0]> = {}) =>
    footerResizeGate({ cur: "3d", next: "3e", inner: 378, lastInner: 380, sinceLastMs: 16, ...o })
  assert.equal(g({ shift: 220 }), "defer") // 侧栏要推宽：降级不提交
  assert.equal(g({ shift: 220, next: "3c", inner: 382 }), "commit") // 升级照常
})

test("#228 H2 源码：计量在底栏里窄时只隐身占位（不随容器查询 0↔20px 跳宽）；hook 接闸门、侧栏目标宽、字形补载也守只升不降", () => {
  const footer = read("composer-footer.tsx")
  assert.match(footer, /\[&_\[data-session-meter\]\]:inline-flex \[&_\[data-session-meter\]\]:invisible @\[36rem\]:\[&_\[data-session-meter\]\]:visible/)
  const meter = readFileSync(join(dir, "..", "usage", "session-meter.tsx"), "utf8")
  assert.match(meter, /data-testid="session-meter"/)
  const hook = read("use-footer-density.ts")
  assert.match(hook, /footerResizeGate\(\{/)
  assert.match(hook, /rowInner: footerTargetInner\(/)
  assert.match(hook, /useChatStore\.subscribe\(/)
  assert.match(hook, /s\.sidebarCollapseState === prev\.sidebarCollapseState/)
  assert.match(hook, /lastShift\.current > 0 && footerStepIndex\(next\) > footerStepIndex\(cur\)/)
  assert.match(hook, /state: useChatStore\.getState\(\)\.sidebarCollapseState/)
  assert.doesNotMatch(hook, /MutationObserver|data-testid|__fd/)
  // S7：生产选择器用专用属性，不靠 data-testid；两头都钉住
  assert.match(hook, /const NAV_CARD_SELECTOR = "\[data-nav-card\]"/)
  const nav = readFileSync(join(dir, "..", "..", "app-shell", "chrome", "nav-card.tsx"), "utf8")
  assert.match(nav, /data-nav-card=""/)
  assert.match(nav, /setNarrow\(narrowSidebarWindow\(window\.innerWidth\)\)/)
  assert.match(meter, /data-session-meter=""/)
  assert.doesNotMatch(footer, /\[data-testid=session-meter\]/)
})
