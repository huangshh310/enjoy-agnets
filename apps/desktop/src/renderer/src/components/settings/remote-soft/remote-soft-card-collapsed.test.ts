/**
 * P2 Remote soft：折叠态读写。
 */
import assert from "node:assert/strict"
import test from "node:test"
import {
  REMOTE_SOFT_CARD_COLLAPSED_KEY,
  readRemoteSoftCardCollapsed,
  writeRemoteSoftCardCollapsed
} from "./remote-soft-card-collapsed.ts"

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    key: (index: number) => Array.from(map.keys())[index] ?? null
  }
}

test("默认展开（无键 / 非 1）", () => {
  const storage = memoryStorage()
  assert.equal(readRemoteSoftCardCollapsed(storage), false)
  storage.setItem(REMOTE_SOFT_CARD_COLLAPSED_KEY, "0")
  assert.equal(readRemoteSoftCardCollapsed(storage), false)
})

test("收起后记住；再展开清除为 0", () => {
  const storage = memoryStorage()
  writeRemoteSoftCardCollapsed(true, storage)
  assert.equal(storage.getItem(REMOTE_SOFT_CARD_COLLAPSED_KEY), "1")
  assert.equal(readRemoteSoftCardCollapsed(storage), true)
  writeRemoteSoftCardCollapsed(false, storage)
  assert.equal(storage.getItem(REMOTE_SOFT_CARD_COLLAPSED_KEY), "0")
  assert.equal(readRemoteSoftCardCollapsed(storage), false)
})
