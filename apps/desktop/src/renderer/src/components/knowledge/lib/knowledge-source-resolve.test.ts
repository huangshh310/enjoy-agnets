import assert from "node:assert/strict"
import { test } from "node:test"
import { pickedPathToRelative } from "../knowledge-workspace-path.ts"
import {
  findSourceIdByPath,
  isIndexableKnowledgeFile,
  presetExistsInWorkspace
} from "./knowledge-source-resolve.ts"

test("浏览工作区内文件夹得到相对路径", () => {
  const result = pickedPathToRelative("c:/ws", "C:/ws/login-rs")
  assert.deepEqual(result, { status: "ok", path: "login-rs" })
})

test("浏览工作区外路径标 outside，不要静默丢掉", () => {
  assert.equal(pickedPathToRelative("c:/ws", "D:/other").status, "outside")
})

test("取消选择标 cancel", () => {
  assert.equal(pickedPathToRelative("c:/ws", undefined).status, "cancel")
  assert.equal(pickedPathToRelative("c:/ws", "").status, "cancel")
})

test("jpg 不能建文本分块，markdown 可以", () => {
  assert.equal(isIndexableKnowledgeFile("bg.jpg"), false)
  assert.equal(isIndexableKnowledgeFile("notes.md"), true)
})

test("已有同路径来源则复用 id，不要再 addSource", () => {
  const id = findSourceIdByPath(
    [
      { id: "ks1", path: "." },
      { id: "ks2", path: "bg.jpg" }
    ],
    "bg.jpg"
  )
  assert.equal(id, "ks2")
})

test("当前工作区没有 design 时预设不可用", () => {
  assert.equal(presetExistsInWorkspace("design", ["login-rs"]), false)
  assert.equal(presetExistsInWorkspace(".", ["login-rs"]), true)
  assert.equal(presetExistsInWorkspace("login-rs", ["login-rs"]), true)
})
