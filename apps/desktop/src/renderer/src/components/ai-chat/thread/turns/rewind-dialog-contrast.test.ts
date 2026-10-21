/**
 * luna g159 ⑩：弹窗里的灰字对比度 ≥ 4.5:1（浅色 / 深色都算）。按 packages/ui/styles/theme.css 的语义色和色阶，
 * 加 Tailwind 的 neutral 色阶（theme.css 没覆盖的那几档，oklch 无彩色 → 线性 RGB = L³）现算，不靠截图取色；
 * 带透明度的 text-x/NN 按 sRGB alpha 合成到底色上再算。只准用语义 token（lint no-raw-colors 也挡 raw palette）。
 * 检查：正文、正文下的提示灰字、「找不到记录」灰块、二次确认的文件名单和「还有 N 个」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const tsx = readFileSync(new URL("./rewind-from-here-dialog.tsx", import.meta.url), "utf8")
const theme = readFileSync(new URL("../../../../../../../../../packages/ui/styles/theme.css", import.meta.url), "utf8")

/** Tailwind 4 neutral 色阶的 oklch L（theme.css 覆盖的档位以 theme.css 为准）。 */
const TAILWIND_NEUTRAL_L: Record<string, number> = {
  "50": 0.985, "100": 0.97, "200": 0.922, "300": 0.87, "400": 0.708, "500": 0.556,
  "600": 0.439, "700": 0.371, "800": 0.269, "900": 0.205, "950": 0.145
}

function block(selector: RegExp): Record<string, string> {
  const out: Record<string, string> = {}
  const start = theme.search(selector)
  assert.ok(start >= 0, String(selector))
  const body = theme.slice(theme.indexOf("{", start) + 1, theme.indexOf("\n}", start))
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim()
  return out
}
const root = block(/^:root \{/m)
const dark = block(/^\.dark \{/m)
const primitives = block(/^@theme \{/m)

type Rgb = [number, number, number]

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}

/** 变量名（不带 --）→ sRGB（0–1，伽马空间）。 */
function rgbOf(name: string, mode: "light" | "dark"): Rgb {
  const value = (mode === "dark" ? dark[name] : undefined) ?? root[name] ?? primitives[name]
  if (value) {
    const ref = /^var\(--([\w-]+)\)$/.exec(value)
    if (ref) return rgbOf(ref[1]!, mode)
    const hex = /^#([0-9a-f]{6})$/i.exec(value)
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16) / 255) as Rgb
    assert.fail(`unsupported color ${name}: ${value}`)
  }
  if (name === "color-white") return [1, 1, 1]
  const neutral = /^color-neutral-(\d+)$/.exec(name)
  assert.ok(neutral && TAILWIND_NEUTRAL_L[neutral[1]!] !== undefined, `unknown token ${name}`)
  // oklch 无彩色：线性 RGB 三通道都 = L³。
  const c = linearToSrgb(TAILWIND_NEUTRAL_L[neutral[1]!]! ** 3)
  return [c, c, c]
}

function luminanceOfRgb([r, g, b]: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}
function luminance(name: string, mode: "light" | "dark"): number {
  return luminanceOfRgb(rgbOf(name, mode))
}

/** 文字（可带 /NN 透明度）叠在底色上之后的亮度：按 sRGB 做 alpha 合成（浏览器的合成方式）。 */
function textOn(fg: { name: string; alpha: number }, bg: string, mode: "light" | "dark"): number {
  const f = rgbOf(fg.name, mode)
  const b = rgbOf(bg, mode)
  return luminanceOfRgb(f.map((c, i) => c * fg.alpha + b[i]! * (1 - fg.alpha)) as Rgb)
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** 某个 data-testid 元素的 className。 */
function classesOf(testId: string): string[] {
  const m = new RegExp(`data-testid="${testId}"[^>]*?className="([^"]+)"`).exec(tsx)
  assert.ok(m, `className for ${testId}`)
  return m[1]!.split(/\s+/)
}

/** 文字色：浅色取不带前缀的 text-*，深色优先 dark:text-*；只认语义色类 text-text-*（可带 /NN）。 */
function textToken(classes: string[], mode: "light" | "dark"): { name: string; alpha: number } {
  const isColor = (c: string) => /^text-text-[a-z-]+(\/\d+)?$/.test(c)
  const plain = classes.find(isColor)
  const darkCls = classes.find((c) => c.startsWith("dark:") && isColor(c.slice(5)))
  const chosen = mode === "dark" && darkCls ? darkCls.slice(5) : plain
  assert.ok(chosen, `semantic text color in ${classes.join(" ")}`)
  const [token, pct] = chosen.slice("text-".length).split("/")
  return { name: `color-${token}`, alpha: pct ? Number(pct) / 100 : 1 }
}

const DIALOG_BG = "color-background-primary-default"
const cases: Array<{ testId: string; bg: string }> = [
  { testId: "rewind-body", bg: DIALOG_BG },
  { testId: "rewind-hint", bg: DIALOG_BG },
  { testId: "rewind-failure\"\\s+data-failure-kind=\"missing", bg: "color-background-secondary-default" },
  { testId: "rewind-files", bg: DIALOG_BG },
  { testId: "rewind-files-more", bg: DIALOG_BG }
]

test("弹窗灰字对比度 ≥ 4.5:1（浅色 / 深色）", () => {
  const report: string[] = []
  for (const { testId, bg } of cases) {
    const classes = classesOf(testId)
    if (testId.startsWith("rewind-failure")) assert.ok(classes.includes("bg-background-secondary-default"), "missing line bg")
    for (const mode of ["light", "dark"] as const) {
      const fg = textToken(classes, mode)
      const ratio = contrast(textOn(fg, bg, mode), luminance(bg, mode))
      const label = `${fg.name}${fg.alpha < 1 ? `/${Math.round(fg.alpha * 100)}` : ""}`
      report.push(`${testId.split('"')[0]} ${mode} ${label} on ${bg} = ${ratio.toFixed(2)}`)
      assert.ok(ratio >= 4.5, `${testId} ${mode}: ${label} on ${bg} = ${ratio.toFixed(2)} < 4.5`)
    }
  }
  console.log(report.join("\n"))
})

test("算法自检：复现 luna 量到的旧值（提示灰字浅色 2.58 / 深色 1.94，深色正文 3.19，「找不到记录」浅色 4.43）", () => {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.03
  assert.ok(near(contrast(luminance("color-text-tertiary", "light"), luminance(DIALOG_BG, "light")), 2.58))
  assert.ok(near(contrast(luminance("color-text-tertiary", "dark"), luminance(DIALOG_BG, "dark")), 1.94))
  assert.ok(near(contrast(luminance("color-text-secondary", "dark"), luminance(DIALOG_BG, "dark")), 3.19))
  assert.ok(
    near(contrast(luminance("color-text-secondary", "light"), luminance("color-background-secondary-default", "light")), 4.43)
  )
})

test("luna g159 ⑬：正文 / 提示用 text-pretty，中文末行不留孤字（不改文案）", () => {
  assert.ok(classesOf("rewind-body").includes("text-pretty"))
  assert.ok(classesOf("rewind-hint").includes("text-pretty"))
})

test("luna g159 ⑪：置灰的按钮看得出置灰（disabled:opacity-50），正在跑的那颗不淡、转圈", () => {
  const footer = tsx.slice(tsx.indexOf("<DialogFooter"), tsx.indexOf("</DialogFooter>"))
  assert.match(footer, /className="[^"]*\bdisabled:opacity-50\b[^"]*"/)
  assert.match(footer, /data-\[busy=true\]:opacity-100/)
  assert.match(footer, /data-busy=\{button\.busy \? "true" : undefined\}/)
  assert.match(footer, /\{button\.busy \? <RiLoader4Line[^>]*animate-spin/)
})
