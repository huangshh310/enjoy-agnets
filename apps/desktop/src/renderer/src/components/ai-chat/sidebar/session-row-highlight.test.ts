/**
 * 进行中与项目树可各有一行；只有点中的那一行高亮。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isSessionRowActive } from "./session-row-highlight.ts"

test("未点过进行中时只亮项目树那一行", () => {
  assert.equal(isSessionRowActive("s1", "s1", null, "tree"), true)
  assert.equal(isSessionRowActive("s1", "s1", null, "active"), false)
})

test("点了进行中只亮进行中，项目树那行关掉", () => {
  const clicked = { id: "s1", surface: "active" as const }
  assert.equal(isSessionRowActive("s1", "s1", clicked, "active"), true)
  assert.equal(isSessionRowActive("s1", "s1", clicked, "tree"), false)
})

test("选中已切走时两行都不亮", () => {
  const clicked = { id: "s1", surface: "active" as const }
  assert.equal(isSessionRowActive("s1", "s2", clicked, "active"), false)
  assert.equal(isSessionRowActive("s2", "s2", clicked, "tree"), true)
})
