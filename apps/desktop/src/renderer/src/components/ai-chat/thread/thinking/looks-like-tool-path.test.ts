import assert from "node:assert/strict"
import { test } from "node:test"
import { looksLikeToolPath } from "./looks-like-tool-path.ts"

test("拒绝 Edit File 标题残词", () => {
  assert.equal(looksLikeToolPath("File"), false)
  assert.equal(looksLikeToolPath("command"), false)
  assert.equal(looksLikeToolPath("Edit"), false)
})

test("接受真实相对路径和带扩展名文件", () => {
  assert.equal(looksLikeToolPath("README.md"), true)
  assert.equal(looksLikeToolPath("src/app/page.tsx"), true)
  assert.equal(looksLikeToolPath("package.json"), true)
})
