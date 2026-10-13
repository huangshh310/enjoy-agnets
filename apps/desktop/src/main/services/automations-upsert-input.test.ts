import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applyAutomationEnabled,
  parseAutomationUpsert,
  parseSetAutomationEnabled,
  parseStoredAutomations
} from "./automations-upsert-input.ts"

const OLD_EMPTY = { id: "auto_old", name: "旧规则", prompt: "", trigger: "manual", enabled: true, updatedAt: 1 }
const base = { name: "日报", trigger: "manual" as const, enabled: true }

test("写入：说明为空 / 只有空白都拒绝（主进程，不只 UI）", () => {
  assert.throws(() => parseAutomationUpsert({ ...base, prompt: "" }), /prompt is required/)
  assert.throws(() => parseAutomationUpsert({ ...base, prompt: "   \n\t " }), /prompt is required/)
})

test("写入：有内容的说明照常通过，不改写原文", () => {
  const parsed = parseAutomationUpsert({ ...base, prompt: "  总结今天的提交  " })
  assert.equal(parsed.prompt, "  总结今天的提交  ")
})

test("读：旧的空说明记录仍能加载（读 schema 不收紧）", () => {
  const [row] = parseStoredAutomations(JSON.stringify([OLD_EMPTY]))
  assert.equal(row!.prompt, "")
})



test("生产读路径 parseStoredAutomations：旧空说明记录加载，坏条目丢弃，坏 JSON 返回空", () => {
  const rows = parseStoredAutomations(JSON.stringify([OLD_EMPTY, { id: 3 }]))
  assert.equal(rows.length, 1)
  assert.equal(rows[0]!.prompt, "")
  assert.deepEqual(parseStoredAutomations("{oops"), [])
  assert.deepEqual(parseStoredAutomations(null), [])
})

test("旧的空说明记录可以暂停：setEnabled 不过说明校验，其它字段原样", () => {
  const list = parseStoredAutomations(JSON.stringify([OLD_EMPTY]))
  const input = parseSetAutomationEnabled({ id: "auto_old", enabled: false })
  const applied = applyAutomationEnabled(list, input, 99)!
  assert.equal(applied.item.enabled, false)
  assert.equal(applied.item.prompt, "")
  assert.equal(applied.item.updatedAt, 99)
  // 写回后再读仍能加载。
  assert.equal(parseStoredAutomations(JSON.stringify(applied.next))[0]!.enabled, false)
  // 整条 upsert 仍会拒（证明开关必须走 setEnabled）。
  assert.throws(() => parseAutomationUpsert({ name: "旧规则", prompt: "", trigger: "manual", enabled: false }))
})

test("setEnabled：找不到 id 返回 undefined；入参缺 enabled 拒绝", () => {
  assert.equal(applyAutomationEnabled([], { id: "x", enabled: true }, 1), undefined)
  assert.throws(() => parseSetAutomationEnabled({ id: "x" }))
})
