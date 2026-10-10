/**
 * 激活标记优先，没有标记再回落第一份启用档案。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { pickActiveEnabled } from "./pick-active-enabled.ts"

test("显式 active 优先；都标 false 时不回落第一份禁用标记", () => {
  const rows = [
    { id: "a", enabled: true, active: false },
    { id: "b", enabled: true, active: true },
    { id: "c", enabled: false, active: true }
  ]
  assert.equal(pickActiveEnabled(rows, { enabled: (row) => row.enabled, active: (row) => row.active })?.id, "b")
  assert.equal(
    pickActiveEnabled(
      [
        { id: "a", enabled: true, active: false },
        { id: "b", enabled: true, active: undefined }
      ],
      { enabled: (row) => row.enabled, active: (row) => row.active }
    )?.id,
    "b"
  )
  assert.equal(
    pickActiveEnabled([{ id: "a", enabled: true }], {
      enabled: (row) => row.enabled,
      active: (row) => (row.id === "missing" ? true : undefined)
    })?.id,
    "a"
  )
})
