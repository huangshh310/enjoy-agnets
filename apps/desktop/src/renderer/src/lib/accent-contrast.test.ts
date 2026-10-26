/**
 * luna h163 对比度巡检（P2 / P3）：五种强调色 × 亮 / 暗 × 经典 / glass（无 GPU 回退，luna 真机就是这条路），
 * 直接读 theme.css / glass.css / globals.css 和组件源码里的类名算 WCAG 对比度。字 ≥ 4.5，图形 ≥ 3。
 *
 * 打印整张表：ACCENT_CONTRAST_REPORT=1 node --experimental-strip-types --test src/renderer/src/lib/accent-contrast.test.ts
 *
 * glass 开 GPU 时底下是桌面壁纸（透明窗），算不出确定值，这里不算；回退路径的底色是 globals.css 里写死的
 * #fff / #fafafa（亮）与 neutral-900 / #1c1c1c（暗），下面有断言盯着。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { THEME_ACCENTS } from "../hooks/use-theme-accent.ts"
import { HEATMAP_LEVEL_CLASSES } from "../components/account/constants.ts"
import {
  contrast,
  gradientStops,
  layerScope,
  over,
  parseCssDecls,
  resolveColor,
  rgbToOklch,
  toHex,
  twColor,
  type Rgba
} from "./css-contrast.ts"

const repo = new URL("../../../../../../", import.meta.url)
const read = (rel: string) => readFileSync(new URL(rel, repo), "utf8")
const src = (rel: string) => read(`apps/desktop/src/renderer/src/${rel}`)

const twTheme = readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8")
const themeCss = read("packages/ui/styles/theme.css")
const glassCss = read("packages/ui/styles/skins/glass.css")
const inkCss = read("packages/ui/styles/skins/ink.css")
const sketchCss = read("packages/ui/styles/skins/sketch.css")
const globalsCss = read("packages/ui/styles/globals.css")
const table = parseCssDecls(
  globalsCss,
  parseCssDecls(sketchCss, parseCssDecls(inkCss, parseCssDecls(glassCss, parseCssDecls(themeCss, parseCssDecls(twTheme)))))
)

type Mode = "light" | "dark"
/** checks() 只跑经典 / glass；手绘（ink）/ 素描（sketch）目前只用于发送按钮的焦点环 / 最外圈（见 FOCUS_CONTEXTS）。 */
type Skin = "classic" | "glass" | "ink" | "sketch"
type Area = "main" | "drawer" | "sidebar"
type Ctx = { accent: (typeof THEME_ACCENTS)[number]; mode: Mode; skin: Skin }

const CONTEXTS: Ctx[] = THEME_ACCENTS.flatMap((accent) =>
  (["light", "dark"] as const).flatMap((mode) => (["classic", "glass"] as const).map((skin) => ({ accent, mode, skin })))
)
/** 发送按钮焦点环 / 最外圈：五种强调色 × 亮暗 × 经典 / glass / 手绘 / 素描。 */
const FOCUS_SKINS = ["classic", "glass", "ink", "sketch"] as const
const FOCUS_CONTEXTS: Ctx[] = THEME_ACCENTS.flatMap((accent) =>
  (["light", "dark"] as const).flatMap((mode) => FOCUS_SKINS.map((skin) => ({ accent, mode, skin })))
)
/** 琥珀的主按钮固定是 500 底墨色字（theme.css :root[data-accent="amber"] 里的 cta token），表头标出来。 */
const column = (ctx: Ctx) => (ctx.accent.id === "amber" ? "amber（500 底墨色字）" : ctx.accent.id)

const NO_GPU = 'html[data-skin="glass"]:not([data-gpu-compositing="on"])'
const NO_GPU_DARK = 'html.dark[data-skin="glass"]:not([data-gpu-compositing="on"])'

const scopeCache = new Map<string, Map<string, string>>()
function scope(ctx: Ctx, area: Area): Map<string, string> {
  const key = `${ctx.accent.id}|${ctx.mode}|${ctx.skin}|${area}`
  const hit = scopeCache.get(key)
  if (hit) return hit
  const built = buildScope(ctx, area)
  scopeCache.set(key, built)
  return built
}
function buildScope(ctx: Ctx, area: Area): Map<string, string> {
  const dark = ctx.mode === "dark"
  const glass = ctx.skin === "glass"
  const sels = ["@theme default", "@theme", ":root"]
  if (dark) sels.push(".dark", ".dark[data-accent]")
  sels.push(`:root[data-accent="${ctx.accent.id}"]`)
  if (dark) sels.push(`:root.dark[data-accent="${ctx.accent.id}"]`)
  if (glass) {
    sels.push('html[data-skin="glass"]')
    if (dark) sels.push('html.dark[data-skin="glass"]')
    sels.push(NO_GPU)
    if (dark) sels.push(NO_GPU_DARK)
    // 抽屉（SettingsSideDrawer）和左侧导航卡都是 aside.rounded-3xl，回退时吃同一套侧栏 token。
    if (area !== "main") {
      sels.push(`${NO_GPU} aside.rounded-3xl`)
      if (dark) sels.push(`${NO_GPU_DARK} aside.rounded-3xl`)
    }
  }
  if (ctx.skin === "ink" || ctx.skin === "sketch") {
    sels.push(`html[data-skin="${ctx.skin}"]`)
    if (dark) sels.push(`html.dark[data-skin="${ctx.skin}"]`)
    // 手绘亮色：焦点环 / 发送按钮边改墨色
    if (ctx.skin === "ink" && !dark) sels.push('html[data-skin="ink"]:not(.dark)')
  }
  // use-theme-accent.ts 行内写的 500 / 600 优先级最高。
  return layerScope(table, sels, { "--color-accent-500": ctx.accent.c500, "--color-accent-600": ctx.accent.c600 })
}

/** 类名里的颜色片段 → 表达式。shadcn 别名（primary / input）是不带 --color- 前缀的变量。 */
const expr = (token: string) => {
  const [name, alpha] = token.split("/")
  if (["primary", "primary-foreground", "input", "background", "foreground"].includes(name!)) return twColor(`var(--${name})${alpha ? `/${alpha}` : ""}`)
  return twColor(token)
}
const col = (ctx: Ctx, area: Area, token: string) => resolveColor(expr(token), scope(ctx, area))
const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 }

/** 某块区域自身的不透明底色。 */
function surface(ctx: Ctx, area: Area): Rgba {
  const dark = ctx.mode === "dark"
  if (ctx.skin === "glass") {
    // globals.css 无 GPU 回退：main 纯白 / neutral-900，aside 卡 #fafafa / #1c1c1c（!important）。
    if (area === "main") return dark ? col(ctx, area, "neutral-900") : WHITE
    return resolveColor(dark ? "#1c1c1c" : "#fafafa", scope(ctx, area))
  }
  const full = col(ctx, area, "background-full")
  return over(col(ctx, area, area === "sidebar" ? "background-secondary-default" : "background-primary-default"), full)
}
/** 在 base 上依次叠若干层（类名片段）。 */
const stack = (ctx: Ctx, area: Area, base: Rgba, ...tokens: string[]) =>
  tokens.reduce((acc, t) => over(col(ctx, area, t), acc), base)
/** 主栏里的卡片（settings-card、main .rounded-2xl.border）：经典是 primary 底，glass 是 frost tile。 */
const card = (ctx: Ctx) =>
  ctx.skin === "glass"
    ? over(resolveColor("var(--skin-frost-tile)", scope(ctx, "main")), surface(ctx, "main"))
    : surface(ctx, "main")

/** 阴影 token 里 1px 实线圈的颜色：outer = `0 0 0 1px <色>`（画在元素外），inset = `inset 0 0 0 1px <色>`。没有就 null。 */
function ringColor(ctx: Ctx, token: string, kind: "outer" | "inset"): Rgba | null {
  if (token === "none") return null
  const raw = scope(ctx, "main").get(`--shadow-${token}`)
  assert.ok(raw, `找不到 --shadow-${token}`)
  const v = raw.replace(/\s+/g, " ")
  const color = String.raw`(var\([^)]*\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|transparent)`
  const re = kind === "inset" ? new RegExp(String.raw`inset 0 0 0 1px ${color}`) : new RegExp(String.raw`(?<!inset )(?:^|,) ?0 0 0 1px ${color}`)
  const m = re.exec(v)
  return m ? resolveColor(m[1]!, scope(ctx, "main")) : null
}

/** 输入框（ai-chat-composer.tsx 的 data-frost="chip"）类名里的底色：亮 / 暗。 */
const composerBgTokens = () => {
  const [, light, dark] = pick(src("components/ai-chat/ai-chat-composer.tsx"), /border border-border-button-default bg-([\w-]+) dark:bg-([\w-]+)/, "输入框底色")
  return { light: light!, dark: dark! }
}
/** 实测：手绘暗色输入框渲染出来是靛蓝（luna 真机取色，发送按钮旁）。 */
const INK_DARK_MEASURED = ["#323755", "#2d3351"] as const
/** 实测：手绘亮色输入框是天空蓝渐变，发送按钮旁 #569ac3，上沿 #5caad4（luna r6 取色）。 */
const INK_LIGHT_MEASURED = ["#569ac3", "#5caad4"] as const
/**
 * 输入框真实底色（可能不止一个，取最差）。第一个是该皮肤的主值。
 *   经典：surface 上叠 bg-background-secondary-default（亮 = neutral-100 #f7f7f7）/ dark:bg-background-tertiary-default（neutral-800）。
 *   glass：无 GPU 回退下 frost chip 叠在主栏上。
 *   手绘：输入框同时带 .rounded-3xl.shadow-card，skins/ink.css 里天空那条规则特异性最高，所以底是天空渐变（不是 --skin-ink-paper）：
 *         发送按钮旁实测（亮 #569ac3 / #5caad4，暗 #323755 / #2d3351）+ 渐变两端 --skin-ink-sky / --skin-ink-sky-bot。
 *   素描：--skin-sketch-sheet。
 */
function composerSurfaces(ctx: Ctx): [string, Rgba][] {
  const dark = ctx.mode === "dark"
  const main = scope(ctx, "main")
  if (ctx.skin === "glass") return [["glass frost chip", over(resolveColor("var(--skin-frost-chip)", main), surface(ctx, "main"))]]
  if (ctx.skin === "ink") {
    const measured = (dark ? INK_DARK_MEASURED : INK_LIGHT_MEASURED).map((h): [string, Rgba] => [`实测 ${h}`, resolveColor(h, main)])
    return [...measured, ["--skin-ink-sky", resolveColor("var(--skin-ink-sky)", main)], ["--skin-ink-sky-bot", resolveColor("var(--skin-ink-sky-bot)", main)]]
  }
  if (ctx.skin === "sketch") return [["--skin-sketch-sheet", resolveColor("var(--skin-sketch-sheet)", main)]]
  const t = composerBgTokens()
  return [[dark ? t.dark : t.light, stack(ctx, "main", surface(ctx, "main"), dark ? t.dark : t.light)]]
}
/** 发送按钮旁的底色（间隔色要跟它几乎一样）：手绘只取实测那两个，渐变另一端离按钮远。 */
const nearSend = (ctx: Ctx) => composerSurfaces(ctx).filter(([n]) => ctx.skin !== "ink" || n.startsWith("实测"))

type Check = { item: string; label: string; min: number | null; fg: Rgba; bg: Rgba; ratio?: number }
const TEXT = 4.5
const GRAPHIC = 3
const HEAT_STEP = 1.3

const pick = (s: string, re: RegExp, what: string) => {
  const m = re.exec(s)
  assert.ok(m, `源码里找不到：${what}`)
  return m
}
/** 从类名串里取强调色色阶：亮色是不带前缀的那个，暗色取 dark: 的（没有就同亮色）。 */
const lightDark = (cls: string, prop: string) => {
  const l = new RegExp(`(?:^|\\s)${prop}-(accent-\\d+(?:/\\d+)?)`).exec(cls)
  const d = new RegExp(`(?:^|\\s)dark:${prop}-(accent-\\d+(?:/\\d+)?)`).exec(cls)
  assert.ok(l, `${cls} 缺 ${prop}`)
  return { light: l[1]!, dark: (d ?? l)[1]! }
}

// ---------- 源码扫描：浅色字落在实心强调色上的地方 ----------
// 单元 = 一个元素的类名：cx()/cn()/clsx()/twMerge() 整个调用（跨行、多个字符串合在一起算），其余每个字符串字面量各算一个。
// 一个单元里同时有「浅色字」和「实心强调色底」就把每个底色解析成真实颜色（按每种强调色 × 亮暗 × 皮肤 × 琥珀变体），要求 ≥ 4.5。
// 浅色字：text-white / text-text-white / text-primary-foreground / text-cta-foreground
// 强调色底：bg-/from-/via-/to- + accent-N | primary | cta | cta-hover | button-primary（含它内置的悬停 / 按下渐变）| (--color-accent-N) | [var(--color-accent-N)]
// 任意前缀（hover: / group-hover: / data-[…]: …）都算；带 dark: 的只在暗色里算。带 /透明度 的底不算实心，不扫。
/** next：同一文件里紧接着（2 行内）的下一个单元——白色图标常写在实心底的子元素上。 */
type ClassUnit = { where: string; line: number; text: string; next?: ClassUnit }
const SCAN_ROOTS = ["apps/desktop/src/renderer/src", "packages/ui"]
const VARIANTS = String.raw`((?:[\w-]*(?:\[[^\]\s]*\])?(?:\/[\w-]+)?:)*)`
const SOLID_ACCENT_BG = new RegExp(
  String.raw`(?<![\w-])${VARIANTS}(bg|from|via|to)-(accent-\d+|primary|cta|cta-hover|button-primary|\(--color-accent-\d+\)|\[var\(--color-accent-\d+\)\])(?![\w/-])`,
  "g"
)
const LIGHT_FG = new RegExp(String.raw`(?<![\w-])${VARIANTS}text-(white|text-white|primary-foreground|cta-foreground)(?![\w/-])`, "g")
const LIGHT_FG_NAMES = new Set(["white", "text-white", "primary-foreground", "cta-foreground"])
/** 任意 text-* 片段（只用来判 dark: 覆盖：暗色里同前缀槽位有 dark:text-… 就不再算不带 dark: 的浅色字）。 */
const ANY_FG = new RegExp(String.raw`(?<![\w-])${VARIANTS}text-([a-z][\w-]*)(?![\w/-])`, "g")

function classUnits(code: string, file: string): ClassUnit[] {
  const lits: { start: number; end: number; text: string }[] = []
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]
    if (ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i)
      i = nl < 0 ? code.length : nl
    } else if (ch === "/" && code[i + 1] === "*") {
      const e = code.indexOf("*/", i + 2)
      i = e < 0 ? code.length : e + 1
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1
      while (j < code.length && code[j] !== ch && (ch === "`" || code[j] !== "\n")) j += code[j] === "\\" ? 2 : 1
      lits.push({ start: i, end: j, text: code.slice(i + 1, j) })
      i = j
    }
  }
  const inLit = (pos: number) => lits.some((l) => pos > l.start && pos < l.end)
  const regions: [number, number][] = []
  // cva() 的各个变体是互斥的，不合并（每个字符串各算一个单元）。
  for (const m of code.matchAll(/\b(?:cx|cn|clsx|twMerge)\(/g)) {
    const open = m.index! + m[0].length - 1
    if (inLit(open) || regions.some(([a, b]) => open > a && open < b)) continue
    let depth = 0
    let k = open
    for (; k < code.length; k++) {
      const lit = lits.find((l) => l.start === k)
      if (lit) {
        k = lit.end
        continue
      }
      if (code[k] === "(") depth++
      else if (code[k] === ")" && --depth === 0) break
    }
    regions.push([open, k])
  }
  const lineOf = (pos: number) => code.slice(0, pos).split("\n").length
  const units: ClassUnit[] = regions.map(([a, b]) => ({
    where: `${file}:${lineOf(a)}`,
    line: lineOf(a),
    text: lits.filter((l) => l.start > a && l.end < b).map((l) => l.text).join(" ")
  }))
  for (const l of lits) {
    if (!regions.some(([a, b]) => l.start > a && l.end < b)) units.push({ where: `${file}:${lineOf(l.start)}`, line: lineOf(l.start), text: l.text })
  }
  units.sort((x, y) => x.line - y.line)
  units.forEach((u, i) => {
    const n = units[i + 1]
    if (n && n.line - u.line <= 2) u.next = n
  })
  return units
}

let unitCache: ClassUnit[] | null = null
function allClassUnits(): ClassUnit[] {
  if (unitCache) return unitCache
  unitCache = []
  for (const root of SCAN_ROOTS) {
    const base = new URL(`${root}/`, repo)
    for (const rel of readdirSync(base, { recursive: true }) as string[]) {
      if (!/\.tsx?$/.test(rel) || rel.includes("node_modules") || rel.endsWith(".test.ts")) continue
      unitCache.push(...classUnits(readFileSync(new URL(rel, base), "utf8"), `${root}/${rel}`))
    }
  }
  return unitCache
}

type Tok = { variants: string; name: string; full: string }
const toks = (text: string, re: RegExp, nameAt: number): Tok[] =>
  [...text.matchAll(re)].map((m) => ({ variants: m[1] ?? "", name: m[nameAt]!, full: m[0] }))
const isDark = (t: Tok) => /(?:^|:)dark:/.test(t.variants)
const slot = (t: Tok, kind: string) => `${kind}|${t.variants.replace(/(^|:)dark:/, "$1")}`
/** 这个状态下生效的片段：亮色去掉 dark:；暗色里同一槽位（同属性、同其它前缀）有 dark: 的，就盖掉不带 dark: 的。 */
function effective(list: Tok[], ctx: Ctx, kind: (t: Tok) => string): Tok[] {
  if (ctx.mode === "light") return list.filter((t) => !isDark(t))
  const darkSlots = new Set(list.filter(isDark).map((t) => slot(t, kind(t))))
  return list.filter((t) => isDark(t) || !darkSlots.has(slot(t, kind(t))))
}
const bgKind = (t: Tok) => (/^(?:from|via|to)-/.test(t.full.replace(/^.*:/, "")) ? t.full.replace(/^.*:/, "").split("-")[0]! : "bg")

/** 一个底色类名片段 → 可能出现的实心颜色（渐变取每个色标）。 */
function solidColors(ctx: Ctx, name: string): Rgba[] {
  if (name === "button-primary") {
    return (["default", "hover", "active"] as const).flatMap((st) => gradientStops(`var(--gradient-button-primary-${st})`, scope(ctx, "main")))
  }
  const v = /--color-(accent-\d+)/.exec(name)
  return [col(ctx, "main", v ? v[1]! : name)]
}

type LightOnAccent = { where: string; bg: string; fg: string; ratio: number }
/** 所有「浅色字 × 实心强调色底」组合在这个状态下的对比度。 */
function lightOnAccent(ctx: Ctx): LightOnAccent[] {
  const out: LightOnAccent[] = []
  for (const u of allClassUnits()) {
    // 底色要和「所有」底色片段一起判覆盖（dark:bg-accent-500 盖掉 bg-cta）；字色同理（dark:text-neutral-950 盖掉 text-cta-foreground）。
    const bgs = effective(toks(u.text, SOLID_ACCENT_BG, 3), ctx, bgKind).filter((t) => SOLID_ACCENT_BG.source && t)
    const fgAll = (text: string) => effective(toks(text, ANY_FG, 2), ctx, () => "text").filter((t) => LIGHT_FG_NAMES.has(t.name))
    let fgs = fgAll(u.text)
    if (fgs.length === 0 && bgs.length > 0 && u.next) fgs = fgAll(u.next.text)
    if (fgs.length === 0) continue
    for (const bg of bgs) {
      for (const fg of fgs) {
        const fgColor = col(ctx, "main", fg.name)
        for (const c of solidColors(ctx, bg.name)) out.push({ where: u.where, bg: bg.full, fg: fg.full, ratio: contrast(fgColor, c) })
      }
    }
  }
  return out
}

function checks(ctx: Ctx): Check[] {
  const out: Check[] = []
  const dark = ctx.mode === "dark"
  const add = (item: string, label: string, min: number | null, fg: Rgba, bg: Rgba, ratio?: number) => out.push({ item, label, min, fg, bg, ratio })

  // P2-1 主按钮：渐变两端 + 实心主按钮（bg-cta / hover:bg-cta-hover），字色是 cta-foreground（默认白、琥珀墨色）
  const main = scope(ctx, "main")
  const ctaFg = col(ctx, "main", "cta-foreground")
  for (const state of ["default", "hover", "active"] as const) {
    const stops = gradientStops(`var(--gradient-button-primary-${state})`, main)
    const name = { default: "常态", hover: "悬停", active: "按下" }[state]
    add("P2-1", `主按钮渐变·${name}·顶`, TEXT, ctaFg, stops[0]!)
    add("P2-1", `主按钮渐变·${name}·底`, TEXT, ctaFg, stops.at(-1)!)
  }
  add("P2-1", "实心主按钮 bg-cta（含「继续」）", TEXT, ctaFg, col(ctx, "main", "cta"))
  add("P2-1", "实心主按钮 hover:bg-cta-hover", TEXT, ctaFg, col(ctx, "main", "cta-hover"))
  // 源码扫描到的所有「浅色字 × 实心强调色底」，按底色类名汇总（取最差的字色）
  const byBg = new Map<string, LightOnAccent>()
  for (const hit of lightOnAccent(ctx)) {
    const key = hit.bg.replace(/^.*:(?=(?:bg|from|via|to)-)/, (v) => (/(?:^|:)dark:/.test(v) ? "dark:" : /(?:^|:)(?:group-)?hover:/.test(v) ? "hover:" : ""))
    const prev = byBg.get(key)
    if (!prev || hit.ratio < prev.ratio) byBg.set(key, hit)
  }
  for (const [key, hit] of [...byBg].sort(([a], [b]) => a.localeCompare(b))) {
    add("P2-1", `源码扫描·浅色字 on ${key}`, TEXT, WHITE, WHITE, hit.ratio)
  }

  // 复选框（base/checkbox）：选中底 / 悬停底走 cta token，对勾 stroke = var(--color-…)，图形 ≥ 3
  const glyph = read("packages/ui/components/base/checkbox/checkbox-glyph.tsx")
  const [, cbHover, cbRest] = pick(glyph, /hover \? "bg-([\w-]+)" : "bg-([\w-]+)"/, "复选框选中底")
  const strokes = [...glyph.matchAll(/stroke="var\(--color-([\w-]+)\)"/g)].map((m) => m[1]!)
  assert.ok(strokes.length >= 2, "复选框对勾 / 半选横线的 stroke")
  for (const stroke of new Set(strokes)) {
    add("P2-1", `复选框·对勾（${stroke}）on ${cbRest}`, GRAPHIC, col(ctx, "main", stroke), col(ctx, "main", cbRest!))
    add("P2-1", `复选框·对勾（${stroke}）on ${cbHover}（悬停）`, GRAPHIC, col(ctx, "main", stroke), col(ctx, "main", cbHover!))
  }
  // 选中态没有 border：最外圈是 shadow-checkbox-selected 的 1px 内描边（叠在填充上）。对页面底色 ≥ 3（亮：白卡 / neutral-100；暗：neutral-800 / 900），常态和悬停都算。
  const cbShadow = pick(glyph, /"(?:[^"]*\s)?shadow-([\w-]+)(?:\s[^"]*)?",\s*\/\/[^\n]*\n\s*hover \?/, "复选框选中阴影")[1]!
  const rim = ringColor(ctx, cbShadow, "inset")
  assert.ok(rim, `shadow-${cbShadow} 要有 1px 内描边`)
  const pageBgs: [string, Rgba][] = dark
    ? [["neutral-800", col(ctx, "main", "neutral-800")], ["neutral-900", col(ctx, "main", "neutral-900")]]
    : [["白", WHITE], ["neutral-100", col(ctx, "main", "neutral-100")]]
  for (const [bgName, bg] of pageBgs) {
    for (const [fill, state] of [[cbRest!, "常态"], [cbHover!, "悬停"]] as const) {
      add("P2-1", `复选框·选中外圈 vs ${dark ? "暗" : "亮"}·${bgName}（${state}）`, GRAPHIC, over(rim, over(col(ctx, "main", fill), bg)), bg)
    }
  }

  // P2-2 热力图：最浅一档对卡片 ≥ 3；相邻两档 ≥ 1.25（看得出差别）
  const levels = ([1, 2, 3, 4] as const).map((n) => {
    const cls = HEATMAP_LEVEL_CLASSES[n]
    const d = /(?:^|\s)dark:bg-([\w-]+)/.exec(cls)
    const l = pick(cls, /(?:^|\s)bg-([\w-]+)/, `热力图第 ${n} 档`)
    return col(ctx, "main", dark && d ? d[1]! : l[1]!)
  })
  const heatCard = card(ctx)
  add("P2-2", "热力图·最浅数据档 vs 卡片", GRAPHIC, levels[0]!, heatCard)
  // 每种强调色单独一套（theme.css --color-heat-1…4），相邻 ≈ 1.42。
  for (let i = 1; i < levels.length; i++) add("P2-2", `热力图·第 ${i} / ${i + 1} 档区分`, HEAT_STEP, levels[i]!, levels[i - 1]!)

  // P2-3 「已配置」计数 / 技能 Store 角标
  const prov = src("components/settings/providers/providers-settings.tsx")
  const chip = lightDark(pick(prov, /"(bg-accent-50 text-accent-\d+ dark:bg-accent-950 dark:text-accent-\d+)"/, "已配置计数")[1]!, "text")
  add("P2-3", "设置·「已配置」计数", TEXT, col(ctx, "main", dark ? chip.dark : chip.light), col(ctx, "main", dark ? "accent-950" : "accent-50"))
  const tb = src("components/skills/components/skills-toolbar.tsx")
  const store = lightDark(pick(tb, /"(rounded-full bg-accent-500\/10 [^"]*)"/, "Store 角标")[1]!, "text")
  const storeFg = col(ctx, "main", dark ? store.dark : store.light)
  const tabRow = stack(ctx, "main", card(ctx), "background-secondary-default/70")
  add("P2-3", "技能·Store 角标（未选中页签上）", TEXT, storeFg, stack(ctx, "main", tabRow, "accent-500/10"))
  add("P2-3", "技能·Store 角标（选中页签上）", TEXT, storeFg, stack(ctx, "main", tabRow, "background-primary-default", "accent-500/10"))

  // P2-4 开关：关态轨道的边界 / 开态轨道 vs 抽屉里的卡片（catch-up 卡 = secondary 底）
  // 只看轨道（SwitchPrimitive.Root）的类名；滑块那串里也有 dark:data-[state=checked]:bg-…。
  const sw = pick(read("packages/ui/components/ui/switch.tsx"), /SwitchPrimitive\.Root[\s\S]*?className=\{cn\(\s*"([^"]*)"/, "开关轨道类名")[1]!
  const drawerCard = stack(ctx, "drawer", surface(ctx, "drawer"), "background-secondary-default")
  const offBorder = /data-\[state=unchecked\]:border-([\w-]+)/.exec(sw)
  // --input 在 :root 上算好再继承（glass 根上是 white 58%），所以按主栏作用域取。
  const offTrack = over(col(ctx, "main", dark ? "input/80" : "input"), drawerCard)
  add("P2-4", "开关·关态轨道边界", GRAPHIC, offBorder ? col(ctx, "drawer", offBorder[1]!) : offTrack, drawerCard)
  const on = /dark:data-\[state=checked\]:bg-([\w-]+)/.exec(sw)
  const onLight = pick(sw, /(?<!:)data-\[state=checked\]:bg-([\w-]+)/, "开关开态")[1]!
  const onTrack = col(ctx, "drawer", dark && on ? on[1]! : onLight)
  add("P2-4", "开关·开态轨道", GRAPHIC, onTrack, drawerCard)
  // 开态滑块 vs 轨道：亮色白滑块（bg-background）配 700；暗色轨道是 500，白滑块在琥珀 / 绿只有 2.15 / 2.54，所以暗色滑块用 on-accent-bright（近黑）。
  const thumb = pick(read("packages/ui/components/ui/switch.tsx"), /SwitchPrimitive\.Thumb[\s\S]*?className=\{cn\(\s*"([^"]*)"/, "开关滑块类名")[1]!
  const thumbOn = dark ? pick(thumb, /dark:data-\[state=checked\]:bg-([\w-]+)/, "暗色开态滑块")[1]! : pick(thumb, /(?:^|\s)bg-([\w-]+)/, "滑块")[1]!
  add("P2-4", "开关·开态滑块 vs 轨道", GRAPHIC, col(ctx, "main", thumbOn), onTrack)

  // P2-5 侧栏选中行 / 搜索框（#168：经典 secondary/tertiary 也按 TEXT 4.5 卡；glass 暗色回退出过 #f7f7f7 底）
  const row = src("components/ai-chat/sidebar/sidebar-session-row.tsx")
  const [, rowBg, rowFg] = pick(row, /active\s*\?\s*"bg-([\w-]+) text-([\w-]+)"/, "会话行选中")
  const side = surface(ctx, "sidebar")
  const rowSurface = stack(ctx, "sidebar", side, rowBg!)
  const tag = ctx.skin === "glass" ? "glass" : "经典"
  add("P2-5", `侧栏·选中会话行文字（${tag}）`, TEXT, col(ctx, "sidebar", rowFg!), rowSurface)
  add("P2-5", `侧栏·选中会话行时间（${tag}）`, TEXT, col(ctx, "sidebar", "text-secondary"), rowSurface)
  add("P2-5", `侧栏·选中会话行三级字（${tag}）`, TEXT, col(ctx, "sidebar", "text-tertiary"), rowSurface)
  assert.match(src("components/ai-chat/ai-chat-sidebar.tsx"), /items-center bg-background-tertiary-default /)
  const search = stack(ctx, "sidebar", side, "background-tertiary-default")
  add("P2-5", `侧栏·快速搜索框文字（${tag}）`, TEXT, col(ctx, "sidebar", "text-secondary"), search)
  add("P2-5", `侧栏·快速搜索框三级字（${tag}）`, TEXT, col(ctx, "sidebar", "text-tertiary"), search)
  assert.match(src("components/app-shell/chrome/module-nav.tsx"), /bg-background-tertiary-default\/80 /)
  const navSearch = stack(ctx, "sidebar", side, "background-tertiary-default/80")
  add("P2-5", `设置导航·搜索框输入字（${tag}）`, TEXT, col(ctx, "sidebar", "text-primary"), navSearch)

  // P2-6 外观页·未选中的皮肤名（常态 / 悬停）
  const skin = src("components/settings/appearance/appearance-skin-card.tsx")
  const [, skinFg, skinHover] = pick(skin, /: "text-([\w-]+) group-hover:text-([\w-]+)"/, "皮肤名未选中")
  add("P2-6", "外观·未选中皮肤名", TEXT, col(ctx, "main", skinFg!), card(ctx))
  add("P2-6", "外观·未选中皮肤名（悬停）", TEXT, col(ctx, "main", skinHover!), card(ctx))

  // P2-7 分段控件未选中项
  const pillBg = stack(ctx, "drawer", surface(ctx, "drawer"), "background-secondary-default")
  const trig = src("components/automations/components/trigger-pills.tsx")
  add("P2-7", "自动化·触发方式未选中", TEXT, col(ctx, "drawer", pick(trig, /: "bg-background-secondary-default text-([\w-]+) /, "触发未选中")[1]!), pillBg)
  const sched = src("components/automations/components/schedule-fields.tsx")
  add("P2-7", "自动化·频率未选中（工作日 / 每周）", TEXT, col(ctx, "drawer", pick(sched, /: "bg-background-secondary-default text-([\w-]+) ring-/, "频率未选中")[1]!), pillBg)
  const mode = src("components/automations/components/mode-pills.tsx")
  add("P2-7", "自动化·模式未选中", TEXT, col(ctx, "drawer", pick(mode, /text-cta-foreground" : "text-([\w-]+)"/, "模式未选中")[1]!), pillBg)
  const tog = src("components/ai-chat/composer/explore-execute/explore-execute-toggle.tsx")
  // 输入框底：经典读 ai-chat-composer.tsx 的 bg-… dark:bg-…（亮色 secondary = neutral-100 #f7f7f7，不是白）；glass 是 frost chip。
  const composer = composerSurfaces(ctx)[0]![1]
  // 发送按钮（亮色 bg-cta，图标 text-cta-foreground；暗色 500 底近黑图标）本身对输入框底 ≥ 3。
  // 亮色有 1px border-cta-edge：琥珀 500 底对白只有 2.15，靠 700 描边（5.05）给出边界；其它色描边 = 800。
  const send = src("components/ai-chat/composer/runtime-interact/composer-send-split.tsx")
  const sendCls = pick(send, /const sendClassName =\s*"([^"]*)"/, "发送按钮")[1]!
  const sendTok = (re: RegExp, what: string) => pick(sendCls, re, `发送按钮 ${what}`)[1]!
  // 暗色没写 dark: 的就沿用亮色那个
  const darkOr = (re: RegExp, fallback: RegExp, what: string) => (dark && re.exec(sendCls)?.[1]) || sendTok(fallback, what)
  const sendBg = darkOr(/dark:bg-([\w-]+)/, /(?:^|\s)bg-([\w-]+)/, "底")
  const sendHover = darkOr(/dark:hover:bg-([\w-]+)/, /(?:^|\s)hover:bg-([\w-]+)/, "悬停（hover:bg-…）")
  const sendIcon = darkOr(/dark:text-([\w-]+)/, /(?:^|\s)text-((?:text-)?white|cta-foreground)(?![\w-])/, "图标")
  assert.ok(!/brightness/.test(sendCls), "发送按钮不要用 brightness 提亮（白图标会掉到 500 的对比度）")
  const sendTag = dark ? "暗" : "亮"
  // 最外圈：有 1px 外圈阴影（shadow-nav-selected = 0 0 0 1px accent-500）就是它；没有就是 border；border 透明就是底色。
  const sendShadow = darkOr(/dark:shadow-([\w-]+)/, /(?:^|\s)shadow-([\w-]+)/, "阴影（shadow-…）")
  const sendBorder = darkOr(/dark:border-([a-z][\w-]*)/, /(?:^|\s)border-([a-z][\w-]*)/, "描边（border-…）")
  // Tailwind ring-* / outline-* 也画在 border 外面，比 shadow 的外圈还靠外：有就以它为最外圈（只写宽度没写色 = currentColor = 图标色）。
  const plainToks = sendCls.split(/\s+/).filter((t) => t && !t.includes(":"))
  const darkToks = sendCls.split(/\s+/).filter((t) => t.startsWith("dark:") && !t.slice(5).includes(":")).map((t) => t.slice(5))
  const toks = dark ? [...plainToks, ...darkToks] : plainToks
  const lastTok = (re: RegExp) => toks.filter((t) => re.test(t)).map((t) => re.exec(t)![1] ?? "").pop()
  const utilEdge = (kind: "ring" | "outline"): Rgba | null => {
    const width = lastTok(new RegExp(String.raw`^${kind}(?:-(\d+))?$`))
    if (width === undefined || width === "0") return null
    // 颜色可以带 /透明度（ring-accent-700/30 也要按真实叠色算，leo r5）
    const c = lastTok(new RegExp(String.raw`^${kind}-((?!\d|inset|offset|none|hidden|solid|dashed|dotted|double)[a-z][\w-]*(?:\/\d+)?)$`))
    return col(ctx, "main", c ?? sendIcon)
  }
  const outerRing = utilEdge("outline") ?? utilEdge("ring") ?? ringColor(ctx, sendShadow, "outer")
  const edgeColor = outerRing ?? (sendBorder === "transparent" ? col(ctx, "main", sendBg) : col(ctx, "main", sendBorder))
  const edgeName = outerRing ? "外圈 ring/outline/shadow" : sendBorder === "transparent" ? `底 ${sendBg}` : `border-${sendBorder}`
  add("P2-1", `发送按钮图标（${dark ? "暗" : "亮"}）`, GRAPHIC, col(ctx, "main", sendIcon), col(ctx, "main", sendBg))
  add("P2-1", `发送按钮图标·悬停（${dark ? "暗" : "亮"}）`, GRAPHIC, col(ctx, "main", sendIcon), col(ctx, "main", sendHover))
  add("P2-1", `发送按钮最外圈 vs 输入框底（${sendTag}）`, GRAPHIC, over(edgeColor, composer), composer)
  void edgeName
  if (dark) add("P2-1", "发送按钮悬停 vs 输入框底（暗）", GRAPHIC, col(ctx, "main", sendHover), composer)
  add("P2-7", "输入框·探索/执行未选中", TEXT, col(ctx, "main", pick(tog, /!active && "text-([\w-]+)"/, "探索未选中")[1]!), composer)
  add("P2-7", "输入框·探索/执行未选中（悬停）", TEXT, col(ctx, "main", pick(tog, /!active && !disabled && "hover:text-([\w-]+)"/, "探索悬停")[1]!), composer)
  const explore = lightDark(pick(tog, /"(bg-accent-500\/15 font-medium text-accent-\d+ dark:text-accent-\d+[^"]*)"/, "探索选中")[1]!, "text")
  add("P2-7", "输入框·「探索」选中字", TEXT, col(ctx, "main", dark ? explore.dark : explore.light), stack(ctx, "main", composer, "accent-500/15"))

  // 新会话空态标题里的工作区名（大字，但按 4.5 算）
  const hero = src("components/ai-chat/empty-state/empty-state-header.tsx")
  const heroCls = pick(hero, /<span className="(text-accent-\d+[^"]*)">\{place\}/, "空态标题工作区名")[1]!
  const heroTok = lightDark(heroCls, "text")
  // text-title-1-bold = 24px / 700，WCAG 算大字（门槛 3）。亮色仍按 4.5 卡（luna：琥珀亮色 2.15）；暗色 500 不变，按大字 3 算。
  add("P2-8", `新会话标题·工作区名（${dark ? "暗·大字 3" : "亮·按 4.5"}）`, dark ? GRAPHIC : TEXT, col(ctx, "main", dark ? heroTok.dark : heroTok.light), surface(ctx, "main"))

  // P3-8 glass 次级字回到中性灰（经典 secondary/tertiary 已在 P2-5 按 TEXT 卡）
  if (ctx.skin === "glass") {
    for (const [token, name] of [["text-secondary", "次级字"], ["text-tertiary", "三级字 / 时间戳"], ["text-placeholder", "占位符"]] as const) {
      add("P3-8", `glass·${name} vs 主栏`, TEXT, col(ctx, "main", token), surface(ctx, "main"))
      add("P3-8", `glass·${name} vs 侧栏`, TEXT, col(ctx, "sidebar", token), side)
    }
  }

  // P3-9 排队行上移 / 下移箭头（紧凑行底 = secondary/60 叠在主栏上）
  const turn = src("components/ai-chat/thread/turns/queued-user-turn.tsx")
  const [, iconTok, disabledOp] = pick(turn, /const iconClass =\s*"[^"]*rounded-md text-([\w-]+) [^"]*disabled:opacity-(\d+)"/, "排队箭头")
  const dock = stack(ctx, "main", surface(ctx, "main"), "background-secondary-default/60")
  const icon = col(ctx, "main", iconTok!)
  add("P3-9", "排队·上移/下移箭头", GRAPHIC, icon, dock)
  add("P3-9", `排队·箭头禁用态（opacity-${disabledOp}，WCAG 不要求，仅记录）`, null, over({ ...icon, a: Number(disabledOp) / 100 }, dock), dock)
  return out
}

type Row = { item: string; label: string; min: number | null; ctx: Ctx; ratio: number }
function allRows(): Row[] {
  return CONTEXTS.flatMap((ctx) => checks(ctx).map((c) => ({ item: c.item, label: c.label, min: c.min, ctx, ratio: c.ratio ?? contrast(c.fg, c.bg) })))
}

function report(rows: Row[]): string {
  const ids = [...new Set(rows.map((r) => column(r.ctx)))]
  const keys = [...new Set(rows.map((r) => `${r.item}|${r.label}`))].sort((a, b) => a.split("|")[0]!.localeCompare(b.split("|")[0]!))
  const lines = [`| 项 | 检查 | 门槛 | ${ids.join(" | ")} |`, `|---|---|---|${ids.map(() => "---").join("|")}|`]
  for (const key of keys) {
    const [item, label] = key.split("|")
    const rs = rows.filter((r) => `${r.item}|${r.label}` === key)
    const cells = ids.map((id) => {
      const mine = rs.filter((r) => column(r.ctx) === id)
      if (mine.length === 0) return "—"
      const worst = mine.reduce((a, b) => (b.ratio < a.ratio ? b : a))
      const where = `${worst.ctx.mode === "light" ? "亮" : "暗"}${worst.ctx.skin === "glass" ? "·glass" : ""}`
      const flag = worst.min !== null && worst.ratio < worst.min ? " ❌" : ""
      return `${worst.ratio.toFixed(2)}（${where}）${flag}`
    })
    lines.push(`| ${item} | ${label} | ${rs.find((r) => r.min !== null)?.min ?? "—"} | ${cells.join(" | ")} |`)
  }
  return lines.join("\n")
}

test("对比度报告（ACCENT_CONTRAST_REPORT=1 时打印，每格是该强调色在 亮/暗 × 经典/glass 里最差的一个）", () => {
  const rows = allRows()
  if (process.env.ACCENT_CONTRAST_REPORT) console.log(`\n${report(rows)}\n`)
  assert.ok(rows.length > CONTEXTS.length * 20)
})

test("P2 / P3：每种强调色 × 亮暗 × 经典 / glass 回退，字 ≥ 4.5、图形 ≥ 3、热力图相邻档 ≥ 1.3", () => {
  const bad = allRows()
    .filter((r) => r.min !== null && r.ratio < r.min)
    .map((r) => `${r.item} ${r.label} [${column(r.ctx)} ${r.ctx.mode} ${r.ctx.skin}] = ${r.ratio.toFixed(2)} < ${r.min}`)
  assert.deepEqual(bad, [])
})

test("P2-1 源码扫描：每个「浅色字 × 实心强调色底」单元在每种强调色 × 亮暗 × 皮肤 × 琥珀变体下 ≥ 4.5（带文件位置）", () => {
  const bad = new Set<string>()
  let pairs = 0
  for (const ctx of CONTEXTS) {
    for (const hit of lightOnAccent(ctx)) {
      pairs++
      if (hit.ratio < TEXT) bad.add(`${hit.where} ${hit.fg} on ${hit.bg} [${column(ctx)} ${ctx.mode} ${ctx.skin}] = ${hit.ratio.toFixed(2)}`)
    }
  }
  assert.ok(pairs > 40 * CONTEXTS.length, `扫到的组合太少：${pairs}`)
  assert.deepEqual([...bad], [])
})

test("P2-1：主按钮只走 cta token（bg-cta / bg-button-primary 所在单元配 text-cta-foreground，不写死白字）", () => {
  let n = 0
  for (const u of allClassUnits()) {
    if (!/(?<![\w-])(?:[\w-]*(?:\[[^\]\s]*\])?:)*bg-(?:cta|button-primary)(?![\w/-])/.test(u.text)) continue
    n++
    const own = /text-cta-foreground/.test(u.text)
    // SVG 图形（复选框对勾）用 stroke="var(--color-cta-foreground)"，不是类名
    const svgInk = readFileSync(new URL(u.where.replace(/:\d+$/, ""), repo), "utf8").includes('stroke="var(--color-cta-foreground)"')
    const text = own || svgInk ? `${u.text} text-cta-foreground` : `${u.text} ${u.next?.text ?? ""}`
    assert.ok(!/(?<![\w-])(?:[\w-]*:)*text-(?:text-)?white(?![\w/-])/.test(text), `${u.where} 主按钮写死了白字，琥珀（500 底墨色字）会变成白字 on 500`)
    assert.match(text, /text-cta-foreground/, `${u.where} 主按钮缺 text-cta-foreground`)
  }
  assert.ok(n >= 30, `扫到的主按钮太少：${n}`)
})

test("扫描器自检：跨行 cx()、渐变、bg-primary、任意值变量、cta token 都能认出来", () => {
  const code = [
    'const a = cx(',
    '  "rounded bg-accent-500",',
    '  active && "text-white"',
    ')',
    'const b = "bg-linear-to-b from-accent-500 to-accent-600 text-text-white"',
    'const c = "bg-primary text-primary-foreground"',
    'const d = "bg-(--color-accent-500) text-white"',
    'const e = "bg-[var(--color-accent-500)] text-white"',
    'const f = "bg-cta hover:bg-cta-hover text-cta-foreground"',
    '// const g = "bg-accent-500 text-white"',
    'const h = "bg-accent-500/10 text-white"'
  ].join("\n")
  const units = classUnits(code, "x.tsx").filter((u) => u.text.includes(" ") || u.text.includes("-"))
  const got = units.map((u) => ({ where: u.where, bg: toks(u.text, SOLID_ACCENT_BG, 3).map((t) => t.full), fg: toks(u.text, LIGHT_FG, 2).map((t) => t.full) }))
  assert.deepEqual(got, [
    { where: "x.tsx:1", bg: ["bg-accent-500"], fg: ["text-white"] },
    { where: "x.tsx:5", bg: ["from-accent-500", "to-accent-600"], fg: ["text-text-white"] },
    { where: "x.tsx:6", bg: ["bg-primary"], fg: ["text-primary-foreground"] },
    { where: "x.tsx:7", bg: ["bg-(--color-accent-500)"], fg: ["text-white"] },
    { where: "x.tsx:8", bg: ["bg-[var(--color-accent-500)]"], fg: ["text-white"] },
    { where: "x.tsx:9", bg: ["bg-cta", "hover:bg-cta-hover"], fg: ["text-cta-foreground"] },
    { where: "x.tsx:11", bg: [], fg: ["text-white"] }
  ])
  const amber: Ctx = { accent: THEME_ACCENTS.find((a) => a.id === "amber")!, mode: "light", skin: "classic" }
  assert.equal(contrast(WHITE, solidColors(amber, "(--color-accent-500)")[0]!).toFixed(2), "2.15")
  assert.equal(solidColors(amber, "button-primary").length, 6, "bg-button-primary 自带常态 / 悬停 / 按下三段渐变")
})

test("use-theme-accent 行内 500 / 600 生效；反向对照：旧方案（白字 on 琥珀 500 / 600、绿 500）在门槛下", () => {
  for (const accent of THEME_ACCENTS) {
    const ctx: Ctx = { accent, mode: "light", skin: "classic" }
    assert.equal(toHex(col(ctx, "main", "accent-500")), accent.c500.toLowerCase(), `${accent.id} 500 用的是行内 hex`)
    assert.equal(toHex(col(ctx, "main", "accent-600")), accent.c600.toLowerCase(), `${accent.id} 600 用的是行内 hex`)
  }
  const at = (id: string): Ctx => ({ accent: THEME_ACCENTS.find((a) => a.id === id)!, mode: "light", skin: "classic" })
  assert.equal(contrast(WHITE, col(at("amber"), "main", "accent-500")).toFixed(2), "2.15")
  assert.equal(contrast(WHITE, col(at("amber"), "main", "accent-600")).toFixed(2), "3.19")
  assert.equal(contrast(WHITE, col(at("emerald"), "main", "accent-500")).toFixed(2), "2.54")
  assert.equal(TEXT, 4.5)
  assert.equal(HEAT_STEP, 1.3)
  assert.equal(GRAPHIC, 3)
  assert.ok(contrast(WHITE, col(at("amber"), "main", "accent-600")) < TEXT, "旧的 600 白字必须判不过")
  assert.ok(contrast(WHITE, col(at("amber"), "main", "accent-500")) < GRAPHIC, "旧的 500 白色图标必须判不过")
})

test("P3-8：glass 亮色的次级字 / 三级字 / 占位符 / 次级图标是中性灰（OKLCH 色度 < 0.01），不再掺强调色", () => {
  for (const ctx of CONTEXTS.filter((c) => c.skin === "glass" && c.mode === "light")) {
    for (const token of ["text-secondary", "text-tertiary", "text-placeholder", "foreground-icon-secondary", "foreground-icon-tertiary"]) {
      const [, chroma] = rgbToOklch(col(ctx, "main", token))
      assert.ok(chroma < 0.01, `${ctx.accent.id} glass ${token} 色度 ${chroma.toFixed(3)}`)
    }
  }
})

test("glass 无 GPU 回退的底色还是测试里假设的那几个（改了要同步 surface()）", () => {
  const flat = globalsCss.replace(/\s+/g, " ")
  assert.match(flat, /html:not\(\[data-gpu-compositing="on"\]\) main \{ background-color: #ffffff !important; \}/)
  assert.match(flat, /html:not\(\[data-gpu-compositing="on"\]\) aside\.rounded-3xl \{ background-color: #fafafa !important; \}/)
  assert.match(flat, /html\.dark:not\(\[data-gpu-compositing="on"\]\) aside\.rounded-3xl \{ background-color: #1c1c1c !important; \}/)
  assert.match(flat, /html\.dark:not\(\[data-gpu-compositing="on"\]\) \[data-shell-canvas\] \{ background-color: var\(--color-neutral-900\) !important; \}/)
  assert.match(src("components/settings/settings-side-drawer.tsx"), /<aside[\s\S]*?rounded-3xl/)
})

test("琥珀主按钮固定 500 底 + 墨色字 #1A1612（没有开关）；其它四色 700 底白字", () => {
  assert.equal([...table.keys()].filter((k) => k.includes("data-cta")).length, 0, "不再有 data-cta 开关")
  const hook = read("apps/desktop/src/renderer/src/hooks/use-theme-accent.ts")
  assert.doesNotMatch(hook, /cta-variant|data-cta/)
  for (const accent of THEME_ACCENTS) {
    for (const mode of ["light", "dark"] as const) {
      const ctx: Ctx = { accent, mode, skin: "classic" }
      const amber = accent.id === "amber"
      assert.equal(toHex(col(ctx, "main", "cta")), toHex(col(ctx, "main", amber ? "accent-500" : "accent-700")), `${accent.id} ${mode} cta`)
      assert.equal(toHex(col(ctx, "main", "cta-hover")), toHex(col(ctx, "main", amber ? "accent-400" : "accent-800")), `${accent.id} ${mode} cta-hover`)
      assert.equal(toHex(col(ctx, "main", "cta-foreground")), amber ? "#1a1612" : "#ffffff", `${accent.id} ${mode} cta-foreground`)
      // 琥珀 500 配墨色字常态 / 悬停都 ≥ 4.5
      assert.ok(contrast(col(ctx, "main", "cta-foreground"), col(ctx, "main", "cta")) >= TEXT)
      assert.ok(contrast(col(ctx, "main", "cta-foreground"), col(ctx, "main", "cta-hover")) >= TEXT)
      // --primary（avatar 角标、shadcn checkbox / badge）跟 cta 一致
      assert.equal(toHex(col(ctx, "main", "primary")), toHex(col(ctx, "main", "cta")))
      assert.equal(toHex(col(ctx, "main", "primary-foreground")), toHex(col(ctx, "main", "cta-foreground")))
    }
  }
})

test("启动时套用存下的强调色：App.tsx 模块加载时调 initThemeAccent()；applyThemeAccent 每次都重写（再点当前已选的也生效）", async () => {
  const app = src("App.tsx")
  assert.match(app, /import \{ initThemeAccent \} from "@renderer\/hooks\/use-theme-accent"/)
  assert.match(app, /^initThemeAccent\(\)$/m, "App.tsx 顶层调用 initThemeAccent()")
  // 用最小的 window / document / localStorage 跑一遍真函数
  const store = new Map<string, string>()
  const attrs = new Map<string, string>()
  const props = new Map<string, string>()
  const events: string[] = []
  const g = globalThis as Record<string, unknown>
  const saved = { window: g.window, document: g.document, localStorage: g.localStorage, CustomEvent: g.CustomEvent }
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
  g.document = {
    documentElement: {
      getAttribute: (k: string) => attrs.get(k) ?? null,
      setAttribute: (k: string, v: string) => void attrs.set(k, v),
      removeAttribute: (k: string) => void attrs.delete(k),
      style: { setProperty: (k: string, v: string) => void props.set(k, v) }
    }
  }
  g.window = { dispatchEvent: (e: { type: string }) => void events.push(e.type) }
  g.CustomEvent = class {
    type: string
    constructor(type: string) {
      this.type = type
    }
  }
  try {
    const mod = await import("../hooks/use-theme-accent.ts")
    store.set(mod.THEME_ACCENT_STORAGE_KEY, "amber")
    assert.equal(mod.initThemeAccent(), "amber")
    assert.equal(attrs.get("data-accent"), "amber", "启动时 data-accent = 存下的琥珀")
    assert.equal(props.get("--color-accent-500"), "#f59e0b")
    assert.equal(props.get("--color-accent-600"), "#d97706")
    // 界面被改乱后，再点当前已选的琥珀要重新套上
    attrs.delete("data-accent")
    props.clear()
    mod.applyThemeAccent("amber")
    assert.equal(attrs.get("data-accent"), "amber")
    assert.equal(props.get("--color-accent-500"), "#f59e0b")
    assert.ok(events.filter((e) => e === mod.THEME_ACCENT_CHANGE_EVENT).length >= 2)
    // 存的是乱值 → 蓝色兜底
    store.set(mod.THEME_ACCENT_STORAGE_KEY, "nope")
    assert.equal(mod.initThemeAccent(), "blue")
    assert.equal(attrs.get("data-accent"), "blue")
  } finally {
    Object.assign(g, saved)
  }
})

// ---------- 全站焦点环（luna r5 / r6）：一个 token（--color-focus-ring）+ 一个 utility（focus-ring），五色 × 亮暗 × 经典 / glass / 手绘 / 素描 ----------
// 亮 accent-700、暗 accent-400、手绘亮色墨色 #1A1612；2px 环 + 2px 间隔，间隔色 = 控件所在底色（--focus-ring-offset，各皮肤 / 输入框在 CSS 里设）。
const INK = "#1a1612"
/** 间隔色和所在底色要「看起来一样」：亮度比 ≤ 1.3（写死 #f7f7f7 放在手绘天空蓝上是 2.6，会被抓到）。 */
const OFFSET_MATCH = 1.3
const sendSrc = () => src("components/ai-chat/composer/runtime-interact/composer-send-split.tsx")
const sendConst = (name: string) => pick(sendSrc(), new RegExp(`const ${name} =\\s*"([^"]*)"`), name)[1]!

/** theme.css 里 @utility focus-ring 的 @apply 内容。 */
function focusRingUtility(): string {
  return pick(themeCss.replace(/\/\*[\s\S]*?\*\//g, ""), /@utility focus-ring \{\s*@apply ([^;]+);\s*\}/, "@utility focus-ring")[1]!.trim()
}

/** 某个状态 + 若干额外选择器（按特异性从低到高）下解出来的 scope。 */
const extraScopeCache = new Map<string, Map<string, string>>()
function scopeWith(ctx: Ctx, area: Area, extra: string[]): Map<string, string> {
  const key = `${ctx.accent.id}|${ctx.mode}|${ctx.skin}|${area}|${extra.join(",")}`
  const hit = extraScopeCache.get(key)
  if (hit) return hit
  const base = scope(ctx, area)
  const out = new Map(base)
  for (const sel of extra) {
    const decls = table.get(sel)
    if (!decls) throw new Error(`CSS 里找不到选择器：${sel}`)
    for (const [k, v] of decls) if (k !== "--color-accent-500" && k !== "--color-accent-600") out.set(k, v)
  }
  extraScopeCache.set(key, out)
  return out
}

type FocusSurface = { name: string; area: Area; extra: string[]; bgs: [string, Rgba][]; near: [string, Rgba][] }
/** 焦点环可能落在的底（每种皮肤各几块），以及该处 --focus-ring-offset 由哪些选择器决定。 */
function focusSurfaces(ctx: Ctx): FocusSurface[] {
  const dark = ctx.mode === "dark"
  const main = scope(ctx, "main")
  const chip = ['[data-frost="chip"]', ...(dark ? ['.dark [data-frost="chip"]'] : [])]
  const composer = (extra: string[]): FocusSurface => ({ name: "输入框", area: "main", extra: [...chip, ...extra], bgs: composerSurfaces(ctx), near: nearSend(ctx) })
  const one = (name: string, area: Area, extra: string[], bg: Rgba): FocusSurface => ({ name, area, extra, bgs: [[name, bg]], near: [[name, bg]] })
  if (ctx.skin === "classic") {
    return [one("主栏 / 卡片", "main", [], surface(ctx, "main")), one("侧栏", "sidebar", [], surface(ctx, "sidebar")), composer([])]
  }
  if (ctx.skin === "glass") {
    const noGpuChip = [`html[data-skin="glass"]:not([data-gpu-compositing="on"]) [data-frost="chip"]`, ...(dark ? [`html.dark[data-skin="glass"]:not([data-gpu-compositing="on"]) [data-frost="chip"]`] : [])]
    return [one("主栏（无 GPU 回退）", "main", [], surface(ctx, "main")), one("侧栏 / 抽屉", "sidebar", [], surface(ctx, "sidebar")), one("frost 卡片", "main", [], card(ctx)), composer(noGpuChip)]
  }
  if (ctx.skin === "ink") {
    const sky: [string, Rgba][] = [["--skin-ink-sky", resolveColor("var(--skin-ink-sky)", main)], ["--skin-ink-sky-bot", resolveColor("var(--skin-ink-sky-bot)", main)]]
    const skyRule = 'html[data-skin="ink"] .rounded-3xl.shadow-card:not([data-pane-shell-deco="off"])'
    const inkChip = ['html[data-skin="ink"] [data-frost="chip"].rounded-3xl.shadow-card', ...(dark ? ['html.dark[data-skin="ink"] [data-frost="chip"].rounded-3xl.shadow-card'] : [])]
    return [
      { name: "主栏 / 侧栏（天空渐变）", area: "main", extra: ['html[data-skin="ink"] main'], bgs: sky, near: sky },
      one("纸色卡片", "main", ['html[data-skin="ink"] .settings-card'], resolveColor("var(--skin-ink-paper)", main)),
      composer([skyRule, ...inkChip])
    ]
  }
  const sheet = resolveColor("var(--skin-sketch-sheet)", main)
  return [one("主栏 / 卡片（sheet）", "main", [], sheet), composer(['html[data-skin="sketch"] [data-frost="chip"]'])]
}

/** 类名串里的「常态最外圈」：常驻 ring-* / outline-*（含 /透明度）> 1px 外圈阴影 > border > 底色；暗色叠 dark: 的。 */
function restingEdge(ctx: Ctx, cls: string): { name: string; color: Rgba } {
  const dark = ctx.mode === "dark"
  const plain = cls.split(/\s+/).filter((t) => t && !t.includes(":"))
  const darkOnly = cls.split(/\s+/).filter((t) => t.startsWith("dark:") && !t.slice(5).includes(":")).map((t) => t.slice(5))
  const toks = dark ? [...plain, ...darkOnly] : plain
  const last = (re: RegExp) => toks.filter((t) => re.test(t)).map((t) => re.exec(t)![1] ?? "").pop()
  const COLOR = String.raw`((?!\d|inset|offset|none|hidden|solid|dashed|dotted|double|\[)[a-z][\w-]*(?:\/\d+)?)`
  for (const kind of ["outline", "ring"] as const) {
    const width = last(new RegExp(String.raw`^${kind}(?:-(\d+))?$`))
    if (width === undefined || width === "0") continue
    const c = last(new RegExp(String.raw`^${kind}-${COLOR}$`))
    return { name: `${kind}-${width || "1"} ${c ?? "currentColor"}`, color: c ? col(ctx, "main", c) : col(ctx, "main", last(/^text-([\w-]+)$/) ?? "text-primary") }
  }
  const shadow = last(/^shadow-([a-z][\w-]*)$/) ?? "none"
  const outer = ringColor(ctx, shadow, "outer")
  if (outer) return { name: `shadow-${shadow}`, color: outer }
  const border = last(new RegExp(String.raw`^border-${COLOR}$`))
  const bg = last(/^bg-([a-z][\w-]*)$/)!
  if (!border || border === "transparent") return { name: `底 ${bg}`, color: col(ctx, "main", bg) }
  return { name: `border-${border}`, color: col(ctx, "main", border) }
}

type FocusRow = { ctx: Ctx; check: "焦点环 vs 所在底" | "焦点环 vs 间隔色" | "间隔色 ≈ 所在底" | "发送按钮常态最外圈 vs 输入框底"; where: string; ratio: number }
function focusRows(): FocusRow[] {
  const out: FocusRow[] = []
  for (const ctx of FOCUS_CONTEXTS) {
    const ring = col(ctx, "main", "focus-ring")
    for (const s of focusSurfaces(ctx)) {
      const sc = scopeWith(ctx, s.area, s.extra)
      const offsetRaw = resolveColor("var(--focus-ring-offset)", sc)
      for (const [bgName, bg] of s.bgs) {
        const offset = over(offsetRaw, bg)
        out.push({ ctx, check: "焦点环 vs 所在底", where: `${s.name} ${bgName}`, ratio: contrast(over(ring, bg), bg) })
        out.push({ ctx, check: "焦点环 vs 间隔色", where: `${s.name} ${bgName}`, ratio: contrast(over(ring, offset), offset) })
      }
      for (const [bgName, bg] of s.near) out.push({ ctx, check: "间隔色 ≈ 所在底", where: `${s.name} ${bgName} 间隔 ${toHex(over(offsetRaw, bg))}`, ratio: contrast(over(offsetRaw, bg), bg) })
    }
    for (const name of ["sendClassName", "mutedSendClassName"] as const) {
      if (name === "mutedSendClassName") continue // 未就绪按钮是中性灰描边，不在强调色范围
      const edge = restingEdge(ctx, sendConst(name))
      for (const [bgName, bg] of composerSurfaces(ctx)) out.push({ ctx, check: "发送按钮常态最外圈 vs 输入框底", where: `${edge.name} on ${bgName}`, ratio: contrast(over(edge.color, bg), bg) })
    }
  }
  return out
}
const FOCUS_CHECKS = ["焦点环 vs 所在底", "焦点环 vs 间隔色", "发送按钮常态最外圈 vs 输入框底"] as const
function focusReport(rows: FocusRow[]): string {
  const lines = ["| 检查 | 强调色 | 亮·经典 | 亮·glass | 亮·手绘 | 亮·素描 | 暗·经典 | 暗·glass | 暗·手绘 | 暗·素描 |", "|---|---|---|---|---|---|---|---|---|---|"]
  for (const check of [...FOCUS_CHECKS, "间隔色 ≈ 所在底"] as const) {
    for (const accent of THEME_ACCENTS) {
      const cells = (["light", "dark"] as const).flatMap((mode) =>
        FOCUS_SKINS.map((skin) => {
          const rs = rows.filter((r) => r.check === check && r.ctx.accent.id === accent.id && r.ctx.mode === mode && r.ctx.skin === skin)
          const v = check === "间隔色 ≈ 所在底" ? Math.max(...rs.map((r) => r.ratio)) : Math.min(...rs.map((r) => r.ratio))
          return v.toFixed(2)
        })
      )
      lines.push(`| ${check}${check === "间隔色 ≈ 所在底" ? "（最大，≤ 1.3）" : ""} | ${accent.id} | ${cells.join(" | ")} |`)
    }
  }
  return lines.join("\n")
}

// ---------- 源码扫描：所有交互控件的焦点样式 ----------
const FOCUS_VARIANT = /(?:^|:)(?:focus|focus-visible|focus-within|group-focus-visible|peer-focus-visible|has-\[.*focus.*\]|data-\[focus[^\]]*\]):$/
type FocusHit = { where: string; tok: string; why: string }
/** 一个类名单元里不合规的焦点片段。 */
function badFocusTokens(text: string): string[] {
  const out: string[] = []
  const toks = text.split(/\s+/).filter(Boolean)
  const split = (t: string) => {
    const m = /^((?:[\w-]*(?:\[[^\s]*?\])?(?:\/[\w-]+)?:)*)(.*)$/.exec(t)!
    return { pfx: m[1]!, util: m[2]! }
  }
  const parsed = toks.map((t) => ({ t, ...split(t) }))
  const focusBorderPfx = new Set(parsed.filter((p) => FOCUS_VARIANT.test(p.pfx) && p.util === "border-border-focus-ring").map((p) => p.pfx))
  for (const { t, pfx, util } of parsed) {
    if (/^ring-offset-(?!\d|\(--focus-ring-offset\))/.test(util)) out.push(`${t}（间隔色写死，要走 --focus-ring-offset）`)
    if (!FOCUS_VARIANT.test(pfx)) continue
    if (/^ring-(?!\d|inset|offset|\[)[a-z][\w-]*(?:\/\d+)?$/.test(util) && util !== "ring-border-focus-ring") out.push(`${t}（焦点环颜色只能是 border-focus-ring / focus-ring，不能 accent-* / ring / 透明度）`)
    if (/^ring(?:-1|-\[\d+px\]|-[3-9])?$/.test(util) && !(util === "ring-1" && focusBorderPfx.has(pfx))) out.push(`${t}（焦点环 2px；只有边框变色的输入框可以 border + ring-1 = 2px）`)
    if (/^border-(?:accent-\d+|ring|primary)(?:\/\d+)?$/.test(util) || /^border-border-focus-ring\/\d+$/.test(util)) out.push(`${t}（焦点边框要用 border-border-focus-ring）`)
    if (/^outline-(?!none|hidden|offset)(?:\d|[a-z])/.test(util)) out.push(`${t}（焦点不要再画 outline，走 focus-ring）`)
  }
  return out
}
function focusScan(): FocusHit[] {
  const out: FocusHit[] = []
  for (const u of allClassUnits()) for (const why of badFocusTokens(u.text)) out.push({ where: u.where, tok: why.split("（")[0]!, why })
  return out
}

test("焦点环 token / utility：亮 700、暗 400、手绘亮色墨色 #1A1612；border-focus-ring / --ring 跟它走；utility = 2px 环 + 2px 间隔（--focus-ring-offset）+ outline-hidden", () => {
  const util = focusRingUtility()
  for (const part of ["focus-visible:outline-hidden", "focus-visible:ring-2", "focus-visible:ring-(--color-focus-ring)", "focus-visible:ring-offset-2", "focus-visible:ring-offset-(--focus-ring-offset)"]) {
    assert.ok(util.split(/\s+/).includes(part), `@utility focus-ring 缺 ${part}：${util}`)
  }
  assert.doesNotMatch(util, /outline-none/, "用 outline-hidden（Windows 高对比度下保留焦点框），不要 outline-none")
  assert.doesNotMatch(util, /ring-offset-(?!2\b|\(--focus-ring-offset\))/, "间隔色不能写死")
  for (const ctx of FOCUS_CONTEXTS) {
    const ring = toHex(col(ctx, "main", "focus-ring"))
    const want = ctx.skin === "ink" && ctx.mode === "light" ? INK : toHex(col(ctx, "main", ctx.mode === "dark" ? "accent-400" : "accent-700"))
    assert.equal(ring, want, `${ctx.accent.id} ${ctx.mode} ${ctx.skin} 焦点环`)
    assert.equal(toHex(col(ctx, "main", "border-focus-ring")), ring, "border-focus-ring 跟焦点环同色")
    assert.equal(toHex(resolveColor("var(--ring)", scope(ctx, "main"))), ring, "shadcn --ring 跟焦点环同色")
    const edge = toHex(col(ctx, "main", "send-edge"))
    const wantEdge = ctx.skin === "ink" && ctx.mode === "light" ? INK : ctx.mode === "dark" ? toHex(col(ctx, "main", "accent-400")) : toHex(col(ctx, "main", "cta-edge"))
    assert.equal(edge, wantEdge, `${ctx.accent.id} ${ctx.mode} ${ctx.skin} 发送按钮常态最外圈`)
  }
})

test("全站焦点环：五色 × 亮暗 × 经典 / glass / 手绘 / 素描，对所在底 ≥ 3、对间隔色 ≥ 3、间隔色 ≈ 所在底（手绘亮色按真实天空渐变 #569ac3 / #5caad4）", () => {
  const rows = focusRows()
  if (process.env.ACCENT_CONTRAST_REPORT) console.log(`\n${focusReport(rows)}\n`)
  assert.equal(new Set(rows.map((r) => `${r.ctx.accent.id}|${r.ctx.mode}|${r.ctx.skin}`)).size, THEME_ACCENTS.length * 2 * FOCUS_SKINS.length)
  assert.ok(rows.some((r) => r.ctx.skin === "ink" && r.ctx.mode === "light" && r.where.includes("#569ac3")), "手绘亮色要按实测天空蓝算")
  const bad = rows
    .filter((r) => (r.check === "间隔色 ≈ 所在底" ? r.ratio > OFFSET_MATCH : r.ratio < GRAPHIC))
    .map((r) => `${r.check} [${r.ctx.accent.id} ${r.ctx.mode} ${r.ctx.skin}] ${r.where} = ${r.ratio.toFixed(2)}`)
  assert.deepEqual(bad, [])
})

test("发送 / Stop 按钮：focus-ring + border-send-edge，类名里不写死颜色；反向对照：手绘亮色用 accent 边 / 焦点环过不了", () => {
  for (const name of ["sendClassName", "mutedSendClassName"]) {
    const cls = sendConst(name)
    assert.match(cls, /(?:^|\s)focus-ring(?!\S)/, `${name} 要用 focus-ring`)
    assert.deepEqual(badFocusTokens(cls), [], name)
  }
  const cls = sendConst("sendClassName")
  assert.match(cls, /(?:^|\s)border-send-edge(?!\S)/)
  assert.doesNotMatch(cls, /(?:^|\s)dark:(?:border|shadow|ring)-/, "暗色最外圈由 --color-send-edge 决定，不要再写 dark:border-* / dark:shadow-*")
  assert.match(cls, /(?:^|\s)dark:bg-accent-500(?!\S)/, "暗色底不变（500）")
  const code = sendSrc()
  assert.equal([...code.matchAll(/className=\{(?:sendClassName|ready \? sendClassName : mutedSendClassName)\}/g)].length, 2, "Stop 和发送都用这两个常量")
  // 反向对照：手绘亮色天空蓝上，accent-700 焦点环 / 琥珀 700 边都 < 3
  const at = (id: string): Ctx => ({ accent: THEME_ACCENTS.find((a) => a.id === id)!, mode: "light", skin: "ink" })
  const sky = resolveColor(INK_LIGHT_MEASURED[0], scope(at("blue"), "main"))
  assert.ok(contrast(col(at("blue"), "main", "accent-700"), sky) < GRAPHIC, "蓝 700 在 #569ac3 上必须判不过")
  assert.ok(contrast(col(at("amber"), "main", "cta-edge"), sky) < GRAPHIC, "琥珀 cta-edge 在 #569ac3 上必须判不过")
  assert.ok(contrast(resolveColor(INK, scope(at("blue"), "main")), sky) >= 5.5, "墨色在 #569ac3 上 ≈ 5.9")
  // 暗色反向对照：旧的 500 外圈在手绘靛蓝上判不过
  const dk = (id: string): Ctx => ({ accent: THEME_ACCENTS.find((a) => a.id === id)!, mode: "dark", skin: "ink" })
  const indigo = resolveColor(INK_DARK_MEASURED[0], scope(dk("slate"), "main"))
  assert.ok(contrast(col(dk("slate"), "main", "accent-500"), indigo) < GRAPHIC)
})

test("源码扫描：交互控件不再有 ring-accent-* / 透明度焦点环 / ring-1 / 写死的间隔色 / 焦点 outline；luna 点名的控件都走统一焦点环", () => {
  assert.deepEqual(focusScan().map((h) => `${h.where} ${h.why}`), [])
  let units = 0
  for (const u of allClassUnits()) if (/(?:^|\s)focus-ring(?!\S)/.test(u.text) || /focus[\w-]*:ring-border-focus-ring/.test(u.text)) units++
  assert.ok(units >= 70, `走统一焦点环的控件太少：${units}`)
  // 自检：几种旧写法都要被抓到
  for (const old of [
    "focus-visible:ring-2 focus-visible:ring-accent-500",
    "focus-visible:ring-2 focus-visible:ring-accent-700/30",
    "focus-visible:ring-1 focus-visible:ring-border-focus-ring",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "focus:border-accent-500",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary-default",
    "group-focus-visible:ring-2 group-focus-visible:ring-accent-500",
    "focus-visible:outline-2 focus-visible:outline-accent-500"
  ]) assert.ok(badFocusTokens(old).length > 0, `没抓到：${old}`)
  assert.deepEqual(badFocusTokens("focus:border-border-focus-ring focus:ring-1 focus:ring-border-focus-ring"), [], "输入框 border + ring-1 = 2px 合规")
  // luna 点名：发送 / Stop、输入框焦点边、设置按钮（ui/button + base/buttons）、皮肤卡、强调色选项、对话框关闭按钮
  const named: [string, RegExp][] = [
    ["apps/desktop/src/renderer/src/components/ai-chat/ai-chat-composer.tsx", /isFocused && "border-border-focus-ring ring-1 ring-border-focus-ring /],
    ["packages/ui/components/ui/button.tsx", /focus-ring/],
    ["packages/ui/components/base/buttons/button.tsx", /focus-ring/],
    ["packages/ui/components/base/buttons/icon-button.tsx", /focus-ring/],
    ["packages/ui/components/base/buttons/close-button.tsx", /focus-ring/],
    ["packages/ui/components/ui/dialog.tsx", /focus-ring/],
    ["apps/desktop/src/renderer/src/components/settings/appearance/appearance-skin-card.tsx", /group-focus-visible:ring-2 group-focus-visible:ring-border-focus-ring/],
    ["apps/desktop/src/renderer/src/components/settings/appearance/appearance-accent-picker.tsx", /select-none focus-ring/]
  ]
  for (const [file, re] of named) assert.match(read(file), re, file)
})

test("没写焦点样式的控件不再是 Chromium 默认橙色 outline：base 层 :focus-visible 用焦点环颜色 2px + 2px 透明间隔；隐藏复选框由容器画；MCP 原生复选框（#168）不动", () => {
  const flat = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ")
  assert.match(flat(globalsCss), /@layer base \{ :focus-visible:not\(input\[type="checkbox"\]\) \{ outline: 2px solid var\(--color-focus-ring\); outline-offset: 2px; \} \}/)
  const toggles: [string, string][] = [
    ["packages/ui/components/application/theme/day-night-toggle.css", "theme-switch"],
    ["apps/desktop/src/renderer/src/components/ai-chat/sidebar/locale-switch.css", "locale-switch"]
  ]
  for (const [file, c] of toggles) {
    const css = flat(read(file))
    assert.match(css, new RegExp(String.raw`\.${c}__checkbox \{ outline: none; \}`), `${file} 隐藏复选框不画 Chromium 默认 outline`)
    assert.match(css, new RegExp(String.raw`\.${c}:has\(\.${c}__checkbox:focus-visible\) \.${c}__container \{ outline: 2px solid var\(--color-focus-ring\);`), `${file} 容器只在键盘焦点时画焦点环颜色`)
    assert.doesNotMatch(css, /:focus-within/, `${file} 不用 focus-within（鼠标点也会出）`)
  }
  // 任何 CSS 里的 outline 颜色都只能是焦点环 token
  for (const file of ["packages/ui/styles/globals.css", "packages/ui/styles/theme.css", ...toggles.map(([f]) => f)]) {
    for (const m of flat(read(file)).matchAll(/outline:\s*\d+px\s+solid\s+([^;]+);/g)) assert.match(m[1]!, /^var\(--color-(?:border-)?focus-ring\)$/, `${file} outline 颜色 ${m[1]}`)
  }
  assert.match(read("apps/desktop/src/renderer/src/components/mcp/components/mcp-create-form-body.tsx"), /type="checkbox"/, "MCP 原生复选框还在（#168 单独处理）")
})

test("各皮肤输入框 / 底色真的是测试假设的那样（改了要同步 composerSurfaces / focusSurfaces）", () => {
  const flat = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ")
  // 手绘：输入框同时带 rounded-3xl + shadow-card，命中天空渐变那条（特异性 0,4,1 高于 [data-frost=chip] 的 0,2,1 和纸色卡片的 0,3,3）
  assert.match(src("components/ai-chat/ai-chat-composer.tsx"), /data-frost="chip"[\s\S]{0,200}rounded-3xl[\s\S]{0,200}shadow-card/)
  assert.match(flat(inkCss), /html\[data-skin="ink"\] \.rounded-3xl\.shadow-card:not\(\[data-pane-shell-deco="off"\]\),?[^{]*\{[^}]*background-color: var\(--skin-ink-sky\);[^}]*linear-gradient\(to bottom, var\(--skin-ink-sky\) 0%, var\(--skin-ink-sky-bot\) 100%\)/)
  assert.match(flat(sketchCss), /html\[data-skin="sketch"\] \[data-frost="chip"\],[^{]*\{[^}]*background-color: var\(--skin-sketch-sheet\);/)
})

test("css-contrast 自检：oklch → sRGB 与 Tailwind 官方 hex 一致；WCAG 公式", () => {
  const s = scope(CONTEXTS[0]!, "main")
  const hex = (t: string) => {
    const c = resolveColor(`var(--color-${t})`, s)
    return "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
  }
  assert.equal(hex("amber-800"), "#973c00")
  assert.equal(hex("emerald-400"), "#00d492")
  assert.equal(hex("violet-800"), "#5d0ec0")
  assert.equal(hex("neutral-500"), "#737373")
  assert.equal(hex("blue-400"), "#3392ff", "theme.css 的覆盖生效")
  assert.equal(contrast(WHITE, { r: 0, g: 0, b: 0, a: 1 }).toFixed(1), "21.0")
  assert.equal(contrast(WHITE, resolveColor("#d97706", s)).toFixed(2), "3.19", "luna 量的琥珀 600")
})
