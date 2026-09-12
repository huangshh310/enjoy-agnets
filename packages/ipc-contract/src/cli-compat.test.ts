import assert from "node:assert/strict"
import { test } from "node:test"
import {
  compareCliVersions,
  formatCliVersion,
  requiredVersionFor,
  resolveCliCompat
} from "./cli-compat.ts"

test("低于要求才 outdated；相等或更高是 ok", () => {
  assert.equal(compareCliVersions("1.2", "1.5"), "below")
  assert.equal(compareCliVersions("v1.5", "1.5"), "ok")
  assert.equal(compareCliVersions("1.5.1", "1.5"), "ok")
  assert.equal(compareCliVersions("2026.09.02", "2025.08.01"), "ok")
  assert.equal(compareCliVersions("2024.03.01", "2025.08.01"), "below")
})

test("解析不了或缺段是 unknown，不假警告", () => {
  assert.equal(compareCliVersions("dev", "1.5"), "unknown")
  assert.deepEqual(resolveCliCompat({ version: null, requiredVersion: "1.5" }).kind, "unknown")
  assert.deepEqual(resolveCliCompat({ version: "1.2", requiredVersion: null }).kind, "unknown")
  assert.deepEqual(
    resolveCliCompat({ version: "1.2", cliVersion: "9.0", requiredVersion: "1.5" }).kind,
    "outdated"
  )
})

test("C 端短版本与预览同形", () => {
  assert.equal(formatCliVersion("1.2"), "v1.2")
  assert.equal(formatCliVersion("v1.5.0"), "v1.5.0")
  assert.equal(formatCliVersion("2.1.9 (Claude Code)"), "v2.1.9")
  assert.equal(formatCliVersion(null), "—")
})

test("预览夹具：v1.2 对 ≥1.5 是 outdated", () => {
  const view = resolveCliCompat({ version: "1.2", requiredVersion: "1.5" })
  assert.equal(view.kind, "outdated")
  assert.equal(view.current, "v1.2")
  assert.equal(view.required, "1.5")
})

test("升级后回到 ok；Enjoy Local / 自定义无最低版本", () => {
  assert.equal(resolveCliCompat({ version: "1.5", requiredVersion: "1.5" }).kind, "ok")
  assert.equal(requiredVersionFor("enjoy-local"), null)
  assert.equal(requiredVersionFor("custom:my-acp"), null)
  assert.ok(requiredVersionFor("cursor"))
})
