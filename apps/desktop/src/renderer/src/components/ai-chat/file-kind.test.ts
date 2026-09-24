/**
 * 文件色标：扩展名不区分大小写，未知和无扩展名走通用。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { fileKindForName } from "./file-kind.ts"

test("ts 与 TS 是同一类", () => {
  assert.equal(fileKindForName("foo.ts"), "code")
  assert.equal(fileKindForName("foo.TS"), fileKindForName("foo.ts"))
})

test("未知扩展名和没有扩展名走通用", () => {
  assert.equal(fileKindForName("foo.unknown"), "generic")
  assert.equal(fileKindForName("README"), "generic")
})
