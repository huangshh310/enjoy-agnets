/**
 * UI 确定性规则与 DESIGN.md 静态检查单测
 */
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import {
  NAMED_ANTI_PATTERNS,
  validateDesignManifesto,
  detectViewportTrappedLayout,
  detectUnsafeNativeDialog,
  detectRawHexInClasses
} from "./design-rules.ts"

test("NAMED_ANTI_PATTERNS 包含完整的 8 大劣质 AI 模式", () => {
  assert.equal(NAMED_ANTI_PATTERNS.length, 8)
  assert.ok(NAMED_ANTI_PATTERNS.includes("Centered-Marketing-Hero"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Generic-SaaS-Card"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Invented-Raw-Styles"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Cramped-Evidence-Table"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Deconstructed-Typography"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Viewport-Trapped-Layout"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Fake-Status-Chrome"))
  assert.ok(NAMED_ANTI_PATTERNS.includes("Unsafe-Native-Dialog"))
})

test("根目录 DESIGN.md 必须完整包含所有 8 大 Anti-Patterns 及 Token 规范", () => {
  // 查找根目录 DESIGN.md 路径
  const possiblePaths = [
    join(process.cwd(), "DESIGN.md"),
    join(process.cwd(), "../../DESIGN.md")
  ]
  const designPath = possiblePaths.find((p) => existsSync(p))
  assert.ok(designPath, "必须存在根目录 DESIGN.md")

  const content = readFileSync(designPath, "utf-8")
  const result = validateDesignManifesto(content)

  assert.equal(result.missingAntiPatterns.length, 0, `缺少反模式说明: ${result.missingAntiPatterns.join(", ")}`)
  assert.equal(result.missingTokenCategories.length, 0, `缺少 Token 类别: ${result.missingTokenCategories.join(", ")}`)
  assert.ok(result.valid)
})

test("detectViewportTrappedLayout 正确识别 h-screen 违规", () => {
  const badCode = `<div className="flex flex-col h-screen bg-background-primary-default">`
  const goodCode = `<div className="flex flex-col min-h-[100dvh] bg-background-primary-default">`

  const badViolations = detectViewportTrappedLayout(badCode)
  assert.equal(badViolations.length, 1)
  assert.ok(badViolations[0]?.includes("h-screen"))

  const goodViolations = detectViewportTrappedLayout(goodCode)
  assert.equal(goodViolations.length, 0)
})

test("detectUnsafeNativeDialog 正确识别原生 alert/confirm 违规", () => {
  const badCode = `const ok = window.confirm("Are you sure?")`
  const goodCode = `<ConfirmDialog open={isOpen} onConfirm={handleConfirm} />`

  const badViolations = detectUnsafeNativeDialog(badCode)
  assert.equal(badViolations.length, 1)

  const goodViolations = detectUnsafeNativeDialog(goodCode)
  assert.equal(goodViolations.length, 0)
})

test("detectRawHexInClasses 正确识别硬编码 Hex 颜色类名", () => {
  const badCode = `<button className="rounded-lg bg-[#1e293b] text-[#ffffff] p-2">`
  const goodCode = `<button className="rounded-lg bg-background-secondary-default text-text-primary p-2">`

  const badViolations = detectRawHexInClasses(badCode)
  assert.equal(badViolations.length, 1)
  assert.ok(badViolations[0]?.includes("[#1e293b]"))

  const goodViolations = detectRawHexInClasses(goodCode)
  assert.equal(goodViolations.length, 0)
})

test("皮肤 CSS 按文件拆分，globals 只负责 import", () => {
  const roots = [process.cwd(), join(process.cwd(), "../..")]
  const stylesDir = roots
    .map((root) => join(root, "packages/ui/styles"))
    .find((dir) => existsSync(join(dir, "globals.css")))
  assert.ok(stylesDir, "必须存在 packages/ui/styles")

  const globals = readFileSync(join(stylesDir, "globals.css"), "utf-8")
  assert.ok(globals.includes('@import "./skins/classic.css"'))
  assert.ok(globals.includes('@import "./skins/glass.css"'))
  assert.ok(globals.includes('@import "./skins/glass-canvas.css"'), "玻璃画布由 globals 在 glass.css 之后引入")
  assert.ok(globals.includes('@import "./skins/ink.css"'))
  assert.ok(globals.includes('@import "./skins/sketch.css"'))
  assert.equal(globals.includes("--skin-frost-fill"), false, "玻璃变量不得写进 globals.css")

  const glass = readFileSync(join(stylesDir, "skins/glass.css"), "utf-8")
  const canvas = readFileSync(join(stylesDir, "skins/glass-canvas.css"), "utf-8")
  assert.ok(glass.includes('html[data-skin="glass"]'))
  assert.equal(glass.includes("@import"), false, "glass.css 不再嵌套 @import，避免 Tailwind 丢画布")
  assert.equal(glass.includes("form:has(textarea)"), false, "Composer 禁止 form:has(textarea) 叠白")
  assert.equal(glass.includes("div:has(> textarea)"), false, "Composer 禁止 div:has(> textarea) 叠白")
  assert.equal(`${glass}\n${canvas}`.includes("skin-glass-orb-center"), false, "禁止中心白光斑浇奶")
  assert.ok(glass.includes("[data-frost=\"chip\"]"), "Composer 只走 data-frost=chip")
  assert.ok(glass.includes("--skin-frost-nested"), "嵌套卡片必须有更薄的填充 token")
  assert.ok(glass.includes("url(#skin-liquid-glass)"), "棱镜描边必须挂 #skin-liquid-glass")
  assert.ok(glass.includes("--glass-light-x"), "追光圆心必须是百分比 --glass-light-x")
  assert.equal(glass.includes("* 5px)"), false, "禁止 deg×px 非法 calc")
  assert.ok(canvas.includes("blur(110px)"), "光斑漫射必须 ≥ 110px")

  const filterRoots = [
    join(process.cwd(), "src/renderer/src/components/layout/liquid-glass-filters.tsx"),
    join(process.cwd(), "../../apps/desktop/src/renderer/src/components/layout/liquid-glass-filters.tsx")
  ]
  const filterPath = filterRoots.find((path) => existsSync(path))
  assert.ok(filterPath, "LiquidGlassFilters 必须进包")
  const filters = readFileSync(filterPath, "utf-8")
  assert.ok(filters.includes('id="skin-liquid-glass"'))
  assert.ok(filters.includes("--glass-light-x"))

  const previewRoots = [
    join(process.cwd(), "src/renderer/src/components/settings/appearance/appearance-skin-preview.tsx"),
    join(process.cwd(), "../../apps/desktop/src/renderer/src/components/settings/appearance/appearance-skin-preview.tsx")
  ]
  const previewPath = previewRoots.find((path) => existsSync(path))
  assert.ok(previewPath, "必须存在 appearance-skin-preview")
  const preview = readFileSync(previewPath, "utf-8")
  assert.equal(preview.includes("bg-cyan-400"), false, "预览禁止 raw cyan")
  assert.equal(preview.includes("bg-white/"), false, "预览禁止 raw white")
  assert.equal(preview.includes("slate-900"), false, "预览禁止 raw slate")
  assert.ok(preview.includes("skin-glass-preview-pane"), "玻璃预览皮走 glass.css")
  assert.ok(existsSync(join(stylesDir, "skins/classic.css")))
  const ink = readFileSync(join(stylesDir, "skins/ink.css"), "utf-8")
  assert.ok(ink.includes('html[data-skin="ink"]'))
  const sketch = readFileSync(join(stylesDir, "skins/sketch.css"), "utf-8")
  assert.ok(sketch.includes('html[data-skin="sketch"]'))
})
