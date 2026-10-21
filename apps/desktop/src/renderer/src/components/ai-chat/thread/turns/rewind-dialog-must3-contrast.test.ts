/**
 * 实机 CONDITIONAL 必修 ③（luna h167-m-zh-light-* / h167-m-zh-dark-*）：「从这里重来」弹窗对比度，WCAG 文字 ≥ 4.5、描边 / 图形 ≥ 3。
 *   失败句「从这里重来失败」、「只改聊天」字（cta-foreground：琥珀是墨色，其余白字；渐变每一档）、「删掉并还原」白字（常态 / 悬停 / 按下 / 转圈）、
 *   「取消」「连文件一起还原」描边（对弹窗底和按钮底）、深色弹窗外沿（对遮罩）。
 * 四皮肤（classic / glass / ink / sketch）× 亮暗 × theme.css 里的每个 data-accent 全算。
 * 色值按 Tailwind 色板（tailwindcss/theme.css）+ packages/ui/styles/theme.css + skins/*.css + rewind-dialog.css 叠出来现算，不靠截图取色。
 * 算法同 #166 的 lib/css-contrast.ts（还没合并，这里先内联一份；#166 合并后换成 import 那份）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"

const here = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8")
const STYLES = "../../../../../../../../../packages/ui/styles/"
const tsx = here("./rewind-from-here-dialog.tsx")
const dialogCss = here("./rewind-dialog.css")
const appCss = here("../../../../styles/app.css")
const themeCss = here(`${STYLES}theme.css`)
const skinCss: Record<Skin, string> = {
  classic: here(`${STYLES}skins/classic.css`),
  glass: here(`${STYLES}skins/glass.css`),
  ink: here(`${STYLES}skins/ink.css`),
  sketch: here(`${STYLES}skins/sketch.css`)
}
const buttonTsx = here("../../../../../../../../../packages/ui/components/ui/button.tsx")
const dialogTsx = here("../../../../../../../../../packages/ui/components/ui/dialog.tsx")
const tailwindCss = readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8")

type Skin = "classic" | "glass" | "ink" | "sketch"
type Mode = "light" | "dark"
type Rgba = { r: number; g: number; b: number; a: number }
type DeclTable = Map<string, Map<string, string>>
const SKINS: Skin[] = ["classic", "glass", "ink", "sketch"]
const MODES: Mode[] = ["light", "dark"]

// ---------- CSS 解析：选择器 → 自定义属性 ----------

function stripNested(body: string): string {
  let out = ""
  let depth = 0
  let pending = ""
  for (const ch of body) {
    if (ch === "{") {
      depth++
      pending = ""
      continue
    }
    if (ch === "}") {
      depth--
      continue
    }
    if (depth > 0) continue
    pending += ch
    if (ch === ";") {
      out += pending
      pending = ""
    }
  }
  return out
}

/** 顶层规则块的声明（@media / @supports 跳过；@theme / @theme default 照记，@theme inline 跳过）。props=true 时连普通属性一起记。 */
function parseCss(css: string, props = false, into: DeclTable = new Map()): DeclTable {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "")
  let i = 0
  while (i < src.length) {
    const open = src.indexOf("{", i)
    if (open < 0) break
    const head = src.slice(i, open).trim().split(";").pop()!.trim()
    let depth = 1
    let j = open + 1
    while (j < src.length && depth > 0) {
      if (src[j] === "{") depth++
      else if (src[j] === "}") depth--
      j++
    }
    const body = src.slice(open + 1, j - 1)
    i = j
    if (head.startsWith("@") && head !== "@theme" && head !== "@theme default") continue
    const decls = new Map<string, string>()
    const re = props ? /([\w-]+)\s*:\s*([^;]+);?/g : /(--[\w-]+)\s*:\s*([^;]+);?/g
    for (const m of stripNested(body).matchAll(re)) decls.set(m[1]!, m[2]!.trim().replace(/\s+/g, " "))
    if (decls.size === 0) continue
    for (const sel of head.split(",").map((s) => s.trim().replace(/\s+/g, " "))) {
      const prev = into.get(sel) ?? new Map<string, string>()
      for (const [k, v] of decls) prev.set(k, v)
      into.set(sel, prev)
    }
  }
  return into
}

// ---------- 颜色 ----------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  return [clamp01(toGamma(r)), clamp01(toGamma(g)), clamp01(toGamma(bl))]
}
function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}
const num = (s: string) => (s === "none" ? 0 : s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s))

function parseLiteral(s: string): Rgba | null {
  const v = s.trim().toLowerCase()
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 }
  if (v === "white") return { r: 1, g: 1, b: 1, a: 1 }
  if (v === "black") return { r: 0, g: 0, b: 0, a: 1 }
  let m = /^#([0-9a-f]{3,8})$/.exec(v)
  if (m) {
    let h = m[1]!
    if (h.length <= 4) h = [...h].map((c) => c + c).join("")
    const p = (k: number) => parseInt(h.slice(k, k + 2), 16) / 255
    return { r: p(0), g: p(2), b: p(4), a: h.length === 8 ? p(6) : 1 }
  }
  m = /^rgba?\(([^)]*)\)$/.exec(v)
  if (m) {
    const parts = m[1]!.replace(/\//g, " ").replace(/,/g, " ").split(/\s+/).filter(Boolean)
    const [r, g, b] = parts.slice(0, 3).map((x) => (x.endsWith("%") ? num(x) : parseFloat(x) / 255))
    return { r: r!, g: g!, b: b!, a: parts[3] ? num(parts[3]) : 1 }
  }
  m = /^oklch\(([^)]*)\)$/.exec(v)
  if (m) {
    const parts = m[1]!.replace(/\//g, " ").split(/\s+/).filter(Boolean)
    const L = num(parts[0]!)
    const C = parts[1] === "none" ? 0 : parseFloat(parts[1]!)
    const H = (num(parts[2]!) * Math.PI) / 180
    const [r, g, b] = oklabToRgb(L, C * Math.cos(H), C * Math.sin(H))
    return { r, g, b, a: parts[3] ? num(parts[3]) : 1 }
  }
  return null
}

function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of s) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

function expandVars(value: string, scope: Map<string, string>, depth = 0): string {
  assert.ok(depth < 40, `var() 递归过深：${value}`)
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*))?\)/g, (_, name: string, fb?: string) => {
    const raw = scope.get(name)
    if (raw === undefined) {
      assert.ok(fb !== undefined, `未定义的变量：${name}`)
      return expandVars(fb, scope, depth + 1)
    }
    return expandVars(raw, scope, depth + 1)
  })
}

function mix(a: Rgba, pa: number, b: Rgba, pb: number, space: string): Rgba {
  const sum = pa + pb
  const wa = pa / sum
  const wb = pb / sum
  const alphaMul = sum < 1 ? sum : 1
  const alpha = a.a * wa + b.a * wb
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
  if (space === "oklab") {
    const A = rgbToOklab(a.r, a.g, a.b)
    const B = rgbToOklab(b.r, b.g, b.b)
    const c = [0, 1, 2].map((k) => (A[k]! * a.a * wa + B[k]! * b.a * wb) / alpha) as [number, number, number]
    const [r, g, bl] = oklabToRgb(...c)
    return { r, g, b: bl, a: alpha * alphaMul }
  }
  const ch = (x: number, y: number) => (x * a.a * wa + y * b.a * wb) / alpha
  return { r: ch(a.r, b.r), g: ch(a.g, b.g), b: ch(a.b, b.b), a: alpha * alphaMul }
}

function resolveColor(expr: string, scope: Map<string, string>): Rgba {
  const v = expandVars(expr, scope).trim()
  const lit = parseLiteral(v)
  if (lit) return lit
  const m = /^color-mix\(\s*in\s+(srgb|oklab)\s*,([\s\S]*)\)$/.exec(v)
  assert.ok(m, `解析不了的颜色：${v}`)
  const [s1, s2] = splitTop(m[2]!)
  const part = (s: string) => {
    const pm = /^([\s\S]*?)\s+(\d+(?:\.\d+)?)%$/.exec(s)
    return pm ? { c: resolveColor(pm[1]!, scope), p: parseFloat(pm[2]!) / 100 } : { c: resolveColor(s, scope), p: NaN }
  }
  const A = part(s1!)
  const B = part(s2!)
  let pa = A.p
  let pb = B.p
  if (Number.isNaN(pa) && Number.isNaN(pb)) pa = pb = 0.5
  else if (Number.isNaN(pa)) pa = 1 - pb
  else if (Number.isNaN(pb)) pb = 1 - pa
  return mix(A.c, pa, B.c, pb, m[1]!)
}

function gradientStops(expr: string, scope: Map<string, string>): Rgba[] {
  const v = expandVars(expr, scope).trim()
  const m = /^linear-gradient\(([\s\S]*)\)$/.exec(v)
  assert.ok(m, `不是 linear-gradient：${v}`)
  return splitTop(m[1]!)
    .filter((p) => !/^(\d+deg|to\s)/.test(p))
    .map((p) => resolveColor(p.replace(/\s+\d+(?:\.\d+)?%$/, ""), scope))
}

const over = (fg: Rgba, bg: Rgba): Rgba => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1
})
const luminance = (c: Rgba) => 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b)
function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

// ---------- 叠出某个状态下的 token 表 ----------

const tw = parseCss(tailwindCss)
const theme = parseCss(themeCss)
const skins = Object.fromEntries(SKINS.map((s) => [s, parseCss(skinCss[s])])) as Record<Skin, DeclTable>
const dialogDecls = parseCss(dialogCss)
const ACCENTS = [...themeCss.matchAll(/^:root\[data-accent="(\w+)"\] \{/gm)].map((m) => m[1]!)

function layer(out: Map<string, string>, table: DeclTable, sel: string, required = true): void {
  const decls = table.get(sel)
  if (!decls) {
    assert.ok(!required, `CSS 里找不到选择器：${sel}`)
    return
  }
  for (const [k, v] of decls) out.set(k, v)
}

type Ctx = { skin: Skin; mode: Mode; accent: string; withDialog: boolean }

/** html 上的 token（不含弹窗局部覆盖）。 */
function rootScope({ skin, mode, accent }: Omit<Ctx, "withDialog">): Map<string, string> {
  const out = new Map<string, string>()
  for (const sel of ["@theme default", "@theme"]) layer(out, tw, sel, false)
  layer(out, theme, "@theme")
  layer(out, theme, ":root")
  layer(out, theme, `:root[data-accent="${accent}"]`)
  if (mode === "dark") {
    layer(out, theme, ".dark")
    layer(out, theme, ".dark[data-accent]")
  }
  if (skin !== "classic") {
    layer(out, skins[skin], `html[data-skin="${skin}"]`)
    if (mode === "dark") layer(out, skins[skin], `html.dark[data-skin="${skin}"]`)
  }
  return out
}

/** 弹窗内的 token：html 上的 + [data-rewind-dialog]（+ 深色）；busy 再叠 [data-busy]。 */
function dialogScope(ctx: Ctx, busy = false): Map<string, string> {
  const out = rootScope(ctx)
  if (!ctx.withDialog) return out
  layer(out, dialogDecls, "[data-rewind-dialog]")
  if (ctx.mode === "dark") layer(out, dialogDecls, ".dark [data-rewind-dialog]")
  if (busy) layer(out, dialogDecls, '[data-rewind-dialog] [data-busy="true"]')
  return out
}

const skinProps = Object.fromEntries(SKINS.map((s) => [s, parseCss(skinCss[s], true)])) as Record<Skin, DeclTable>
const N925 = () => resolveColor("var(--color-neutral-925)", rootScope({ skin: "classic", mode: "dark", accent: "blue" }))
const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 }

/**
 * 弹窗底色。弹窗挂 data-pane-shell-deco="off"（下面有断言）：glass 走 deco-off 的实心底，ink / sketch 走 deco-off 的
 * background-primary-default（不再是天空 / 网纹），classic 就是 bg-background-primary-default。
 * withDeco=false：改之前（没挂 deco-off）——ink 是天空渐变、sketch 是纸、glass 是半透明叠在遮罩上（这里取遮罩上的合成色）。
 */
function dialogSurface(ctx: Ctx, withDeco = ctx.withDialog): Rgba {
  const scope = dialogScope(ctx)
  const opaque = (c: Rgba) => (c.a < 1 ? over(c, ctx.mode === "dark" ? N925() : WHITE) : c)
  if (withDeco) {
    if (ctx.skin === "glass") {
      const sel = ctx.mode === "dark" ? 'html.dark[data-skin="glass"] [data-pane-shell-deco="off"]' : 'html[data-skin="glass"] [data-pane-shell-deco="off"]'
      return opaque(resolveColor(skinProps.glass.get(sel)!.get("background-color")!, scope))
    }
    if (ctx.skin !== "classic") {
      const sel = `html[data-skin="${ctx.skin}"] [data-pane-shell-deco="off"].rounded-3xl.shadow-card`
      return opaque(resolveColor(skinProps[ctx.skin].get(sel)!.get("background-color")!, scope))
    }
    return opaque(resolveColor("var(--color-background-primary-default)", scope))
  }
  if (ctx.skin === "ink") return resolveColor("var(--skin-ink-sky-bot)", scope)
  if (ctx.skin === "sketch") return resolveColor("var(--skin-sketch-sheet)", scope)
  const bg = resolveColor("var(--color-background-primary-default)", scope)
  return bg.a < 1 ? over(bg, backdrop(ctx)) : bg
}

/** 遮罩（dialog.tsx 的 bg-black/50）叠在窗口上最亮的那块：画布 / 主卡片 / 皮肤底。canvasOnly：只叠在画布上（luna 实机取色的位置）。 */
function backdrop(ctx: Ctx, canvasOnly = false): Rgba {
  const m = /bg-black\/(\d+)/.exec(dialogTsx)
  assert.ok(m, "dialog overlay bg-black/NN")
  const overlay: Rgba = { r: 0, g: 0, b: 0, a: Number(m[1]) / 100 }
  const scope = rootScope(ctx)
  const base = ctx.mode === "dark" ? N925() : WHITE
  const names = canvasOnly ? ["--color-background-full"] : ["--color-background-full", "--color-background-primary-default", "--color-background-secondary-default",
    "--skin-ink-sky", "--skin-ink-sky-bot", "--skin-ink-paper", "--skin-sketch-paper", "--skin-sketch-sheet"]
  const unders = names.filter((n) => scope.has(n)).map((n) => over(resolveColor(`var(${n})`, scope), base))
  return unders.map((u) => over(overlay, u)).sort((a, b) => luminance(b) - luminance(a))[0]!
}

/** 「取消」「连文件一起还原」(outline) 的描边颜色与按钮底：glass 把 outline 的描边 / 底换成 frost-line / frost-tile。 */
function outline(ctx: Ctx, hover = false): { border: Rgba; fill: Rgba } {
  const scope = dialogScope(ctx)
  const surface = dialogSurface(ctx)
  if (ctx.skin === "glass") {
    return {
      border: over(resolveColor("var(--skin-frost-line)", scope), surface),
      fill: over(resolveColor("var(--skin-frost-tile)", scope), surface)
    }
  }
  const border = over(resolveColor(`var(--color-border-button-${hover ? "hover" : "default"})`, scope), surface)
  const fillToken = hover ? "--color-background-primary-hover" : "--color-background-primary-default"
  return { border, fill: over(resolveColor(`var(${fillToken})`, scope), surface) }
}

function stops(ctx: Ctx, kind: "primary" | "danger"): Array<{ state: string; color: Rgba }> {
  const out: Array<{ state: string; color: Rgba }> = []
  for (const state of ["default", "hover", "active"]) {
    for (const c of gradientStops(`var(--gradient-button-${kind}-${state})`, dialogScope(ctx))) out.push({ state, color: c })
  }
  // 转圈（data-busy，按钮 disabled）：disabled 渐变 + disabled 字色。
  const busy = dialogScope(ctx, true)
  const fgToken = kind === "primary" ? "--color-button-primary-disabled-foreground" : "--color-foreground-disabled-danger"
  for (const c of gradientStops(`var(--gradient-button-${kind}-disabled)`, busy)) out.push({ state: `busy(${fgToken})`, color: c })
  return out
}
function busyText(ctx: Ctx, kind: "primary" | "danger"): Rgba {
  const busy = dialogScope(ctx, true)
  return resolveColor(kind === "primary" ? "var(--color-button-primary-disabled-foreground)" : "var(--color-foreground-disabled-danger)", busy)
}

function buttonTextOn(ctx: Ctx, kind: "primary" | "danger"): Array<{ state: string; ratio: number }> {
  // #166：主按钮字走 text-cta-foreground（琥珀 = 墨色 #1A1612，其余白）；危险按钮仍是白字。
  const fg = resolveColor(kind === "primary" ? "var(--color-cta-foreground)" : "var(--color-text-white)", dialogScope(ctx))
  return stops(ctx, kind).map(({ state, color }) => ({
    state,
    ratio: contrast(state.startsWith("busy") ? busyText(ctx, kind) : fg, color)
  }))
}

const fmt = (n: number) => n.toFixed(2)
const minOf = (xs: number[]) => Math.min(...xs)

function measure(ctx: Ctx) {
  const surface = dialogSurface(ctx)
  const scope = dialogScope(ctx)
  const error = contrast(over(resolveColor("var(--color-text-error-primary)", scope), surface), surface)
  const chat = buttonTextOn(ctx, "primary")
  const del = buttonTextOn(ctx, "danger")
  const ol = outline(ctx)
  const olHover = outline(ctx, true)
  const border = minOf([contrast(ol.border, surface), contrast(ol.border, ol.fill), contrast(olHover.border, surface), contrast(olHover.border, olHover.fill)])
  const edgeBorder = over(resolveColor("var(--color-border-button-default)", scope), surface)
  const bd = backdrop(ctx)
  const edge = Math.max(contrast(edgeBorder, bd), contrast(surface, bd))
  const rest = (xs: Array<{ state: string; ratio: number }>) => minOf(xs.filter((x) => x.state === "default").map((x) => x.ratio))
  return {
    error, chat, del, border, edge,
    edgeBorderOnly: contrast(edgeBorder, bd),
    edgeOnCanvas: contrast(edgeBorder, backdrop(ctx, true)),
    chatRest: rest(chat),
    delRest: rest(del)
  }
}

// ---------- 接线：弹窗确实吃到这些 token ----------

test("必修 ③ 接线：弹窗挂 data-rewind-dialog + deco-off，样式由 app.css 进同一次 Tailwind 编译", () => {
  const content = tsx.slice(tsx.indexOf("<DialogContent"), tsx.indexOf(">", tsx.indexOf("className=", tsx.indexOf("<DialogContent"))))
  assert.match(content, /data-rewind-dialog=""/)
  assert.match(content, /data-pane-shell-deco="off"/)
  assert.match(content, /\bborder border-border-button-default\b/)
  assert.match(tsx, /data-testid="rewind-error" className="[^"]*\btext-text-error-primary\b/)
  assert.match(appCss, /@import "\.\.\/components\/ai-chat\/thread\/turns\/rewind-dialog\.css";/)
  // 按钮取色路径：主按钮 / 危险按钮走渐变 utility，outline 走 border-button-* token。
  assert.match(buttonTsx, /default:\s*"bg-button-primary text-cta-foreground[^"]*disabled:text-button-primary-disabled-foreground/)
  assert.match(buttonTsx, /destructive:\s*"bg-button-danger text-text-white[^"]*disabled:text-foreground-disabled-danger/)
  assert.match(buttonTsx, /outline:\s*"border border-border-button-default[^"]*hover:border-border-button-hover/)
  assert.match(themeCss, /@utility bg-button-primary \{[\s\S]*?var\(--gradient-button-primary-default\)[\s\S]*?var\(--gradient-button-primary-hover\)[\s\S]*?var\(--gradient-button-primary-active\)[\s\S]*?var\(--gradient-button-primary-disabled\)/)
  assert.match(themeCss, /@utility bg-button-danger \{[\s\S]*?var\(--gradient-button-danger-default\)[\s\S]*?var\(--gradient-button-danger-hover\)[\s\S]*?var\(--gradient-button-danger-active\)[\s\S]*?var\(--gradient-button-danger-disabled\)/)
  // 转圈那颗用 data-busy 标出来，CSS 才能把它从 disabled 色里拉回来。
  assert.match(tsx, /data-busy=\{button\.busy \? "true" : undefined\}/)
  assert.ok(ACCENTS.length >= 5, `accents: ${ACCENTS.join(",")}`)
})

test("必修 ③：四皮肤 × 亮暗 × 强调色，失败句 / 两颗实心按钮 ≥ 4.5，描边 / 深色外沿 ≥ 3", () => {
  const report: string[] = []
  const failures: string[] = []
  for (const skin of SKINS) {
    for (const mode of MODES) {
      for (const accent of ACCENTS) {
        const ctx: Ctx = { skin, mode, accent, withDialog: true }
        const m = measure(ctx)
        const tag = `${skin}/${mode}/${accent}`
        const check = (ok: boolean, what: string) => {
          if (!ok) failures.push(`${tag} ${what}`)
        }
        check(m.error >= 4.5, `失败句 ${fmt(m.error)}`)
        for (const s of m.chat) check(s.ratio >= 4.5, `只改聊天 ${s.state} ${fmt(s.ratio)}`)
        for (const s of m.del) check(s.ratio >= 4.5, `删掉并还原 ${s.state} ${fmt(s.ratio)}`)
        check(m.border >= 3, `取消/连文件描边 ${fmt(m.border)}`)
        if (mode === "dark") check(m.edgeBorderOnly >= 3, `深色外沿描边对遮罩 ${fmt(m.edgeBorderOnly)}`)
        else check(m.edge >= 3, `浅色外沿对遮罩 ${fmt(m.edge)}`)
        if (accent === "blue") {
          report.push(
            `${tag}: 失败句 ${fmt(m.error)} · 只改聊天 ${fmt(minOf(m.chat.map((s) => s.ratio)))} · 删掉并还原 ${fmt(minOf(m.del.map((s) => s.ratio)))} · 描边 ${fmt(m.border)} · 外沿 ${fmt(mode === "dark" ? m.edgeBorderOnly : m.edge)}`
          )
        }
      }
    }
  }
  if (process.env.REWIND_CONTRAST_REPORT) console.log(report.join("\n"))
  assert.deepEqual(failures, [])
})

test("必修 ③ 自检：不叠 rewind-dialog.css 时复现 luna 实机量到的旧值（classic 蓝）", () => {
  const near = (a: number, b: number, tol = 0.06) => Math.abs(a - b) <= tol
  const light = measure({ skin: "classic", mode: "light", accent: "blue", withDialog: false })
  const dark = measure({ skin: "classic", mode: "dark", accent: "blue", withDialog: false })
  // 浅色失败句 3.81（red-500 对白）。
  assert.ok(near(light.error, 3.81), `error ${light.error}`)
  // 「只改聊天」：实机旧值 4.03–4.19 是 #166 之前全站 500→600 渐变；#166 合入后全站主按钮渐变已是 700 起，
  // 弹窗不再局部覆盖主按钮渐变（下面断言），不叠弹窗 CSS 时也 ≥ 4.5。
  assert.doesNotMatch(dialogCss.replace(/\/\*[\s\S]*?\*\//g, ""), /--gradient-button-primary-(default|hover|active)\s*:/)
  const chatDefault = light.chat.filter((s) => s.state === "default").map((s) => s.ratio)
  assert.ok(minOf(chatDefault) >= 4.5, `chat ${chatDefault}`)
  // 「删掉并还原」常态 4.1–4.6 区间里有 < 4.5 的一档。
  const delDefault = light.del.filter((s) => s.state === "default").map((s) => s.ratio)
  assert.ok(minOf(delDefault) < 4.5, `del ${delDefault}`)
  // 描边：浅 1.19 / 深 1.46；深色外沿对遮罩 1.91。
  assert.ok(near(contrast(outline({ skin: "classic", mode: "light", accent: "blue", withDialog: false }).border, WHITE), 1.19, 0.03))
  const d: Ctx = { skin: "classic", mode: "dark", accent: "blue", withDialog: false }
  assert.ok(near(contrast(outline(d).border, dialogSurface(d)), 1.46, 0.03), `dark border ${contrast(outline(d).border, dialogSurface(d))}`)
  assert.ok(near(dark.edgeOnCanvas, 1.91, 0.03), `dark edge ${dark.edgeOnCanvas}`)
  // 遮罩下面是主卡片（neutral-800）时更低：1.79。改后的断言按最亮的那块算。
  assert.ok(dark.edgeBorderOnly < dark.edgeOnCanvas)
})

/** 打印改前 / 改后对照表（REWIND_CONTRAST_REPORT=1）。 */
test("必修 ③ 对照表", () => {
  if (!process.env.REWIND_CONTRAST_REPORT) return
  const rows: string[] = ["skin/mode | 失败句 | 只改聊天 常态(全部状态) | 删掉并还原 常态(全部状态) | 描边(min) | 外沿(最亮遮罩)"]
  for (const skin of SKINS) {
    for (const mode of MODES) {
      const b = measure({ skin, mode, accent: "blue", withDialog: false })
      const a = measure({ skin, mode, accent: "blue", withDialog: true })
      const all = ACCENTS.map((accent) => measure({ skin, mode, accent, withDialog: true }))
      const e = (x: typeof a) => (mode === "dark" ? x.edgeBorderOnly : x.edge)
      rows.push(
        `${skin}/${mode} | ${fmt(b.error)}→${fmt(a.error)} | ${fmt(b.chatRest)}(${fmt(minOf(b.chat.map((s) => s.ratio)))})→${fmt(minOf(all.map((x) => x.chatRest)))}(${fmt(minOf(all.flatMap((x) => x.chat.map((s) => s.ratio))))}) | ${fmt(b.delRest)}(${fmt(minOf(b.del.map((s) => s.ratio)))})→${fmt(a.delRest)}(${fmt(minOf(a.del.map((s) => s.ratio)))}) | ${fmt(b.border)}→${fmt(a.border)} | ${fmt(e(b))}→${fmt(e(a))}`
      )
    }
  }
  console.log(rows.join("\n"))
})
