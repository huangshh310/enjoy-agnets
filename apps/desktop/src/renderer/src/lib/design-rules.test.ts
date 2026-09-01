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
