import assert from "node:assert/strict"
import { test } from "node:test"
import {
  backupPathFor,
  escapeTomlString,
  mergeCodexToml,
  sanitizeTomlComment,
  stripEnjoyTomlBlock
} from "./cli-config-format.ts"

test("TOML 字符串转义引号与换行", () => {
  assert.equal(escapeTomlString(`a"b\\c`), String.raw`a\"b\\c`)
  assert.equal(escapeTomlString("line\nnext"), String.raw`line\nnext`)
})

test("注释去掉换行，避免注入新键", () => {
  assert.equal(sanitizeTomlComment("ok\nmodel_provider = \"x\""), 'ok model_provider = "x"')
})

test("Codex merge 保留原文件并加上标记块", () => {
  const merged = mergeCodexToml("model = \"o3\"\n", {
    baseUrl: "https://example.com/v1",
    apiKey: 'k"ey',
    profileName: "Relay"
  })
  assert.match(merged, /model = "o3"/)
  assert.match(merged, /enjoy-agents:begin/)
  assert.match(merged, /base_url = "https:\/\/example.com\/v1"/)
  assert.match(merged, /api_key = "k\\"ey"/)
})

test("再次 merge 只替换标记块，不叠两份", () => {
  const first = mergeCodexToml("keep = true\n", {
    baseUrl: "https://a.example/v1",
    apiKey: "one",
    profileName: "A"
  })
  const second = mergeCodexToml(first, {
    baseUrl: "https://b.example/v1",
    apiKey: "two",
    profileName: "B"
  })
  assert.equal(second.match(/enjoy-agents:begin/g)?.length, 1)
  assert.match(second, /keep = true/)
  assert.match(second, /api_key = "two"/)
  assert.doesNotMatch(second, /api_key = "one"/)
})

test("strip 掉损坏的半截标记块", () => {
  assert.equal(stripEnjoyTomlBlock("head\n# --- enjoy-agents:begin ---\norphan"), "head")
})

test("备份路径挂在原文件旁", () => {
  assert.equal(backupPathFor("/tmp/config.toml"), "/tmp/config.toml.enjoy.bak")
})
