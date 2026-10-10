import assert from "node:assert/strict"
import { test } from "node:test"
import { openSourceChipOnPointer } from "./open-source-chip.ts"

test("主键 pointerdown 先 preventDefault，微任务后打开", async () => {
  let opened = 0
  let prevented = false
  openSourceChipOnPointer(
    {
      button: 0,
      preventDefault: () => {
        prevented = true
      }
    },
    () => {
      opened += 1
    }
  )
  assert.equal(prevented, true)
  assert.equal(opened, 0)
  await Promise.resolve()
  assert.equal(opened, 1)
})

test("右键不打开", async () => {
  let opened = 0
  openSourceChipOnPointer(
    {
      button: 2,
      preventDefault: () => undefined
    },
    () => {
      opened += 1
    }
  )
  await Promise.resolve()
  assert.equal(opened, 0)
})
