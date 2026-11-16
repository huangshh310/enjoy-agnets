import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { pickRailActive, resolveRailActive } from "./thread-preview-rail-active.ts"

const order = ["u1", "a1", "u2", "a2", "u3", "a3"]
const itemIds = ["u1", "u2", "u3"]
const v = (o: Record<string, [number, number]>) => new Map(Object.entries(o).map(([k, [ratio, area]]) => [k, { ratio, area }]))

test("#228 M2：最可见的用户句就是当前位置", () => {
  assert.equal(pickRailActive({ visible: v({ u2: [0.9, 900], u3: [0.3, 300] }), order, itemIds, previous: "u3" }), "u2")
})

test("#228 M2：最可见的是助手消息 → 算到它前面那句用户刻度，不回落第 1 句", () => {
  assert.equal(pickRailActive({ visible: v({ a3: [0.4, 2000] }), order, itemIds, previous: "u3" }), "u3")
  assert.equal(pickRailActive({ visible: v({ a2: [0.6, 1200], u3: [0.2, 100] }), order, itemIds, previous: "u3" }), "u2")
})

test("#228 M2：面积为 0 / 比例为 0（不在视口内、对话区被压成几十 px）的节点不参与；判不出来停在上一次", () => {
  assert.equal(pickRailActive({ visible: v({ u1: [0.5, 0] }), order, itemIds, previous: "u3" }), "u3")
  assert.equal(pickRailActive({ visible: v({ u1: [0, 120] }), order, itemIds, previous: "u2" }), "u2")
  assert.equal(pickRailActive({ visible: new Map(), order, itemIds, previous: "u3" }), "u3")
  // 不认识的 id（已不在会话里）不参与
  assert.equal(pickRailActive({ visible: v({ gone: [1, 999] }), order, itemIds, previous: "u2" }), "u2")
})

test("#228 M2：上一次也不是刻度（助手 id / 空串）→ 落最后一句，不退回第 1 句", () => {
  assert.equal(pickRailActive({ visible: new Map(), order, itemIds, previous: "a1" }), "u3")
  assert.equal(pickRailActive({ visible: new Map(), order, itemIds, previous: "" }), "u3")
  assert.equal(resolveRailActive("a3", itemIds), "u3")
  assert.equal(resolveRailActive("u1", itemIds), "u1")
  assert.equal(resolveRailActive("x", []), "")
})

test("#228 M2：同比例取面积大的，再同取靠后的", () => {
  assert.equal(pickRailActive({ visible: v({ u1: [0.5, 100], u2: [0.5, 300] }), order, itemIds, previous: "u3" }), "u2")
  assert.equal(pickRailActive({ visible: v({ u1: [0.5, 100], u3: [0.5, 100] }), order, itemIds, previous: "u2" }), "u3")
})

test("#228 M2 源码：刻度条接的是 pickRailActive / resolveRailActive，只读 IntersectionObserver，不碰 store", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(dir, "thread-preview-rail.tsx"), "utf8")
  assert.match(src, /pickRailActive\(\{ visible, order, itemIds, previous: previous\(\) \}\)/)
  assert.match(src, /activeId=\{resolveRailActive\(activeId, itemIds\)\}/)
  assert.match(src, /entry\.intersectionRect\.width \* entry\.intersectionRect\.height/)
  assert.doesNotMatch(src, /useChatStore|setState\(/)
})
