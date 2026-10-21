/**
 * 共享复选框 CheckboxGlyph（packages/ui/components/base/checkbox/checkbox-glyph.tsx）真机上没有入口：
 * apps/desktop 里没有任何文件 import base/checkbox（见 #166 PR 正文「共享复选框在哪能看到」），所以 luna 截不到图。
 * 这里直接把组件渲染出来，钉住选中 / 悬停 / 半选 / 未选的类名和对勾颜色（对比度数值在 accent-contrast.test.ts）。
 * node:test 不认 .tsx：用 typescript.transpileModule 现转一次（只转这一个文件，不是构建），import 改成绝对路径后从 data: URL 加载。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const ts = require("typescript") as typeof import("typescript")
const glyphFile = new URL("../../../../../../packages/ui/components/base/checkbox/checkbox-glyph.tsx", import.meta.url)
const cxFile = new URL("../../../../../../packages/ui/utils/cx.ts", import.meta.url)

type GlyphState = { isSelected: boolean; isIndeterminate: boolean; isFocusVisible: boolean; isDisabled: boolean; isHovered: boolean }
type GlyphModule = { CheckboxGlyph: (props: { state: GlyphState; size?: "sm" | "md" }) => unknown }

async function loadGlyph(): Promise<GlyphModule> {
  const { outputText } = ts.transpileModule(readFileSync(glyphFile, "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  })
  const code = outputText
    .replace(/from "@\/utils\/cx"/, `from "${cxFile.href}"`)
    .replace(/from "react\/jsx-runtime"/, `from "${pathToFileURL(require.resolve("react/jsx-runtime")).href}"`)
  assert.doesNotMatch(code, /from "(?!file:)/, "所有 import 都换成了绝对路径")
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)) as GlyphModule
}

const base: GlyphState = { isSelected: false, isIndeterminate: false, isFocusVisible: false, isDisabled: false, isHovered: false }
const render = (mod: GlyphModule, state: Partial<GlyphState>) =>
  renderToStaticMarkup(createElement(mod.CheckboxGlyph as never, { state: { ...base, ...state } }))

test("CheckboxGlyph 选中：bg-cta + shadow-checkbox-selected（内描边 = --color-checkbox-rim），对勾 stroke = cta-foreground", async () => {
  const mod = await loadGlyph()
  const html = render(mod, { isSelected: true })
  assert.match(html, /class="[^"]*\bbg-cta\b[^"]*"/)
  assert.match(html, /\bshadow-checkbox-selected\b/)
  assert.doesNotMatch(html, /bg-cta-hover|from-accent|bg-linear/)
  assert.match(html, /<path d="M[^"]+" stroke="var\(--color-cta-foreground\)"/, "对勾")
  assert.doesNotMatch(html, /--color-white/)
})

test("CheckboxGlyph 选中 + 悬停：bg-cta-hover；禁用时悬停不生效", async () => {
  const mod = await loadGlyph()
  assert.match(render(mod, { isSelected: true, isHovered: true }), /\bbg-cta-hover\b/)
  const disabled = render(mod, { isSelected: true, isHovered: true, isDisabled: true })
  assert.doesNotMatch(disabled, /bg-cta-hover/)
  assert.match(disabled, /\bopacity-50\b/)
})

test("CheckboxGlyph 半选：同一套底色，横线 stroke = cta-foreground", async () => {
  const mod = await loadGlyph()
  const html = render(mod, { isIndeterminate: true })
  assert.match(html, /\bbg-cta\b/)
  assert.match(html, /<path d="M4.5 8H8H11.5" stroke="var\(--color-cta-foreground\)"/)
})

test("CheckboxGlyph 未选：白底 + border-checkbox-default，没有 cta / 对勾", async () => {
  const mod = await loadGlyph()
  const html = render(mod, {})
  assert.match(html, /\bborder-border-checkbox-default\b/)
  assert.doesNotMatch(html, /bg-cta|shadow-checkbox-selected|<path/)
})
