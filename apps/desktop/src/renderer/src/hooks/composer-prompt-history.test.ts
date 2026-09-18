import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyRecallDown,
  applyRecallUp,
  caretOnFirstLine,
  caretOnLastLine,
  type RecallState
} from "./composer-prompt-history.ts"

const EMPTY: RecallState = { index: null, snapshot: "" }

const prompts = ["最近一句", "更早一句", "最早一句"]

test("空输入从最近一句开始；再按 ↑ 往更早走", () => {
  const first = applyRecallUp({
    value: "",
    prompts,
    state: EMPTY,
    caretOnFirstLine: true,
    composerBusy: false
  })
  assert.deepEqual(first, { value: "最近一句", state: { index: 0, snapshot: "最近一句" } })
  const second = applyRecallUp({
    value: "最近一句",
    prompts,
    state: first!.state,
    caretOnFirstLine: true,
    composerBusy: false
  })
  assert.equal(second?.value, "更早一句")
  assert.equal(second?.state.index, 1)
})

test("改过字或光标不在首行时 ↑ 不抢方向键", () => {
  const recalling: RecallState = { index: 0, snapshot: "最近一句" }
  assert.equal(
    applyRecallUp({
      value: "最近一句（改过）",
      prompts,
      state: recalling,
      caretOnFirstLine: true,
      composerBusy: false
    }),
    null
  )
  assert.equal(
    applyRecallUp({
      value: "最近一句\n第二行",
      prompts,
      state: { index: 0, snapshot: "最近一句\n第二行" },
      caretOnFirstLine: false,
      composerBusy: false
    }),
    null
  )
})

test("有 Chip / 附件时不召回", () => {
  assert.equal(
    applyRecallUp({
      value: "",
      prompts,
      state: EMPTY,
      caretOnFirstLine: true,
      composerBusy: true
    }),
    null
  )
})

test("↓ 走过最新一句就清空", () => {
  const down = applyRecallDown({
    value: "最近一句",
    prompts,
    state: { index: 0, snapshot: "最近一句" },
    caretOnLastLine: true,
    composerBusy: false
  })
  assert.deepEqual(down, { value: "", state: { index: null, snapshot: "" } })
})

test("首行 / 末行判定按换行", () => {
  assert.equal(caretOnFirstLine("a\nb", 1), true)
  assert.equal(caretOnFirstLine("a\nb", 2), false)
  assert.equal(caretOnLastLine("a\nb", 2), true)
  assert.equal(caretOnLastLine("a\nb", 1), false)
})
