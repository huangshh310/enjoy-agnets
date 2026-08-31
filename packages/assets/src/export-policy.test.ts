import assert from "node:assert/strict"
import { test } from "node:test"
import { kindFromMediaType, previewExport, resolvePickedExportPath } from "./export-policy.ts"

test("导出预览标出覆盖风险", () => {
  const preview = previewExport("C:/workspace", "out/a.png", true)
  assert.equal(preview.overwriteRisk, true)
  assert.match(preview.targetPath.toLowerCase(), /a\.png/)
})

test("逃逸路径拒绝导出", () => {
  assert.throws(() => previewExport("C:/workspace", "../x.png", false))
})

test("系统保存框选到工作区外即拒", () => {
  assert.throws(() => resolvePickedExportPath("C:/workspace", "C:/Windows/x.png"))
  const inside = resolvePickedExportPath("C:/workspace", "C:/workspace/out/a.png")
  assert.match(inside.toLowerCase(), /a\.png/)
})

test("mediaType 映射 kind", () => {
  assert.equal(kindFromMediaType("image/png"), "image")
  assert.equal(kindFromMediaType("application/pdf"), "pdf")
})
