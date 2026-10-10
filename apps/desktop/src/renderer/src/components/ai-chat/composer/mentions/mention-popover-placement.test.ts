import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MENTION_POPOVER_COLLISION,
  mentionPopoverEdges,
  placeMentionPopover
} from "./mention-popover-placement.ts"

const tiny = { width: 733, height: 480 }

test("输入框靠底时向上展开，顶边不低于标题栏垫", () => {
  const placed = placeMentionPopover({ top: 390, bottom: 448, left: 20, width: 680 }, tiny)
  assert.equal(placed.placement, "above")
  const edges = mentionPopoverEdges(placed, tiny.height)
  assert.ok(edges.top >= MENTION_POPOVER_COLLISION.top - 0.5)
  assert.ok(edges.bottom <= 390)
  assert.ok(placed.maxHeight <= 390 - MENTION_POPOVER_COLLISION.top)
})

test("上方不够且下方更宽时翻到输入框下面", () => {
  const placed = placeMentionPopover({ top: 80, bottom: 140, left: 20, width: 680 }, tiny)
  assert.equal(placed.placement, "below")
  assert.equal(placed.top, 148)
  const edges = mentionPopoverEdges(placed, tiny.height)
  assert.ok(edges.top >= 140)
  assert.ok(edges.bottom <= tiny.height - MENTION_POPOVER_COLLISION.bottom + 0.5)
})

test("居中输入框在 733×480 也不得伸进标题栏", () => {
  const placed = placeMentionPopover({ top: 210, bottom: 268, left: 16, width: 700 }, tiny)
  const edges = mentionPopoverEdges(placed, tiny.height)
  assert.ok(edges.top >= MENTION_POPOVER_COLLISION.top - 0.5)
  assert.ok(edges.bottom <= tiny.height - MENTION_POPOVER_COLLISION.bottom + 0.5)
  assert.ok(placed.maxHeight >= 96)
})
