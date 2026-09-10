/**
 * Grok 路径谓词与 encoded cwd 项目名。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { matchGrokUsageRelPath, projectFromEncodedGroup } from "./grok.ts"

test("恰好三层 usage.json 才匹配", () => {
  assert.equal(matchGrokUsageRelPath("g/id/usage.json"), true)
  assert.equal(matchGrokUsageRelPath("g/id/subagents/x/usage.json"), false)
  assert.equal(matchGrokUsageRelPath("usage.json"), false)
  assert.equal(matchGrokUsageRelPath("g/id/summary.json"), false)
})

test("decode 后只留最后一段；残留百分号编码则省略", () => {
  assert.equal(
    projectFromEncodedGroup("%2FUsers%2Fhuangshh%2Fworkspace%2Fproj%2Fenjoy-agnets"),
    "enjoy-agnets"
  )
  assert.equal(projectFromEncodedGroup("%2fusers%2fdemo%2fapp"), "app")
  assert.equal(projectFromEncodedGroup("short-slug"), "short-slug")
})
