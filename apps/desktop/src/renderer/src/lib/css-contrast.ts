/**
 * WCAG 对比度计算（纯函数，不碰 DOM / node API）：解析 theme.css / glass.css 里的自定义属性，
 * 按选择器顺序叠出某个状态（强调色 × 亮暗 × 皮肤）下的 token 表，再把 var() / color-mix() / oklch() 解成 sRGB。
 * accent-contrast.test.ts 用它锁住对比度；ACCENT_CONTRAST_REPORT=1 时打印整张表。
 *
 * 近似：var() 一律在最终作用域里解析（浏览器是在声明处算好再继承），本仓库里只有 --input 这类别名会有差别。
 * 渐变 / 色块按 sRGB 伽马空间做 alpha 叠加，与 Chromium 的合成一致。
 */

export type Rgba = { r: number; g: number; b: number; a: number }
export type DeclTable = Map<string, Map<string, string>>

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** 去掉块里嵌套的子块（@keyframes、&:hover 之类），只留本层声明。 */
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

/** 去注释，取顶层规则块（@media / @supports 等整段跳过；@theme / @theme default 照记，@theme inline 跳过）。 */
export function parseCssDecls(css: string, into: DeclTable = new Map()): DeclTable {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "")
  let i = 0
  while (i < src.length) {
    const open = src.indexOf("{", i)
    if (open < 0) break
    const head = src.slice(i, open).trim().split(";").pop()!.trim()
    // 找到匹配的 }
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
    for (const m of stripNested(body).matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) decls.set(m[1]!, m[2]!.trim().replace(/\s+/g, " "))
    if (decls.size === 0) continue
    for (const sel of head.split(",").map((s) => s.trim().replace(/\s+/g, " "))) {
      const prev = into.get(sel) ?? new Map<string, string>()
      for (const [k, v] of decls) prev.set(k, v)
      into.set(sel, prev)
    }
  }
  return into
}

/** 按顺序叠加若干选择器的声明，后面的覆盖前面的。缺的选择器直接报错，防止 CSS 改名后测试悄悄失效。 */
export function layerScope(table: DeclTable, selectors: string[], extra: Record<string, string> = {}): Map<string, string> {
  const out = new Map<string, string>()
  for (const sel of selectors) {
    const decls = table.get(sel)
    if (!decls) throw new Error(`CSS 里找不到选择器：${sel}`)
    for (const [k, v] of decls) out.set(k, v)
  }
  for (const [k, v] of Object.entries(extra)) out.set(k, v)
  return out
}

// ---------- 颜色 ----------

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

/** 顶层逗号切分（忽略括号里的逗号）。 */
function splitTop(s: string, sep = ","): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of s) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === sep && depth === 0) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim())
}

/** 把 var(--x) 展开到底（字符串层面），供 linear-gradient 等非颜色值取色标用。 */
export function expandVars(value: string, scope: Map<string, string>, depth = 0): string {
  if (depth > 40) throw new Error(`var() 递归过深：${value}`)
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*))?\)/g, (_, name: string, fb?: string) => {
    const raw = scope.get(name)
    if (raw === undefined) {
      if (fb !== undefined) return expandVars(fb, scope, depth + 1)
      throw new Error(`未定义的变量：${name}`)
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
  // 预乘 alpha
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

/** 解析颜色表达式：字面量 / var() / color-mix(in srgb|oklab, …)。 */
export function resolveColor(expr: string, scope: Map<string, string>): Rgba {
  const v = expandVars(expr, scope).trim()
  const lit = parseLiteral(v)
  if (lit) return lit
  const m = /^color-mix\(\s*in\s+(srgb|oklab)\s*,([\s\S]*)\)$/.exec(v)
  if (m) {
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
  throw new Error(`解析不了的颜色：${v}`)
}

/** linear-gradient(角度, 色 位置, 色 位置…) → 色标列表。 */
export function gradientStops(expr: string, scope: Map<string, string>): Rgba[] {
  const v = expandVars(expr, scope).trim()
  const m = /^linear-gradient\(([\s\S]*)\)$/.exec(v)
  if (!m) throw new Error(`不是 linear-gradient：${v}`)
  return splitTop(m[1]!)
    .filter((p) => !/^(\d+deg|to\s)/.test(p))
    .map((p) => resolveColor(p.replace(/\s+\d+(?:\.\d+)?%$/, ""), scope))
}

/** src-over 叠加：fg（可带 alpha）叠在不透明的 bg 上。 */
export function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}

export function luminance(c: Rgba): number {
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b)
}

export function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

export function toHex(c: Rgba): string {
  return "#" + [c.r, c.g, c.b].map((x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0")).join("")
}

/** Tailwind 颜色类片段 → 颜色表达式：accent-500/15 → color-mix(in oklab, var(--color-accent-500) 15%, transparent)。 */
export function twColor(token: string): string {
  const [name, alpha] = token.split("/")
  const base = name!.startsWith("#") || name!.startsWith("var(") ? name! : `var(--color-${name})`
  return alpha ? `color-mix(in oklab, ${base} ${alpha}%, transparent)` : base
}

/** sRGB → OKLCH（L, C, H°），用来判断「是不是中性灰」。 */
export function rgbToOklch(c: Rgba): [number, number, number] {
  const [L, a, b] = rgbToOklab(c.r, c.g, c.b)
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]
}
