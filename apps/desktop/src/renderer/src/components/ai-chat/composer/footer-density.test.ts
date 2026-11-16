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
  FOOTER_STEPS,
  FOOTER_UPGRADE_HYSTERESIS_PX,
  footerDecide,
  footerDensityOf,
  footerOverflowItems,
  footerOverflowOf,
  footerStepIndex,
  pickFooterDensity,
  type FooterStep,
  type FooterWidthCache
} from "./footer-density.ts"
import { footerDotTone, hostInjectChipShown } from "./footer-dot-tone.ts"
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
  assert.ok(footer.includes('className="flex w-max shrink-0 flex-nowrap items-center gap-1.5"'))
  assert.ok(footer.includes("ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1"))
  assert.ok(footer.includes("group/footer flex min-w-0 flex-nowrap"))
  assert.equal(footer.split("data-footer-density=").length - 1, 1)
  assert.ok(footer.includes('compactVerticalSlack && "gap-y-0.5 pt-0 pb-2"'))
  // 左组裁切用 overflow-x-clip（不裁「已切换」浮签），且只在 L≥1 生效：L0 不命中任何裁切 class（1440 合成层零变化）
  assert.ok(footer.includes('cx("flex min-w-0 flex-1", FOOTER_LEFT_CLIP)'))
  assert.equal(/className="[^"]*overflow-x-clip/.test(footer), false)
  assert.equal(footer.includes("overflow-hidden"), false)
  const density = read("footer-density.ts")
  const clip = density.slice(density.indexOf("FOOTER_LEFT_CLIP ="), density.indexOf("FOOTER_GE2_ONLY_INLINE ="))
  for (const n of [1, 2, 3]) assert.ok(clip.includes(`group-data-[footer-density=${n}]/footer:overflow-x-clip`))
  assert.equal(/(^|[\s"])(-mx-1|px-1|overflow-x-clip)([\s"]|$)/.test(clip.replace(/group-data-\[footer-density=[123]\]\/footer:\S+/g, "")), false)
  assert.equal(clip.includes("footer-density=0"), false)
  assert.equal(clip.includes("overflow-hidden"), false)
  assert.equal(/i18n\.language|innerWidth|matchMedia/.test(footer), false)
  const hook = read("use-footer-density.ts")
  assert.equal(/innerWidth|matchMedia|setInterval/.test(hook), false)
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
  assert.match(read("composer-footer.tsx"), /data-testid="composer-footer-left" className="flex w-max shrink-0 flex-nowrap/)
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
