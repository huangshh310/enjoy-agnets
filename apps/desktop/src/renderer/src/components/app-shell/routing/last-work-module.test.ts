import assert from "node:assert/strict"
import { test } from "node:test"
import { LAST_WORK_MODULE_KEY } from "../constants.ts"
import { readLastWorkModule, writeLastWorkModule } from "./last-work-module.ts"

function memory() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    }
  }
}

test("未写入时回到 Chat", () => {
  assert.equal(readLastWorkModule(memory()), "chat")
})

test("读写上次工作模块", () => {
  const storage = memory()
  writeLastWorkModule("extensions", storage)
  assert.equal(storage.getItem(LAST_WORK_MODULE_KEY), "extensions")
  assert.equal(readLastWorkModule(storage), "extensions")
})

test("非法值回落 Chat", () => {
  const storage = memory()
  storage.setItem(LAST_WORK_MODULE_KEY, "studio")
  assert.equal(readLastWorkModule(storage), "chat")
})
