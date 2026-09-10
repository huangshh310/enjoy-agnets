/**
 * 绑了 Enjoy 档案后，官方 inspect 不得再当当前供应商。
 * 对应用户现象：选了 lucky0625，抽屉顶仍是 xusen.online / gpt-5.6-terra。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { officialAccountRole } from "./official-account-role.ts"

test("官方登录且有 inspect：账号卡是英雄", () => {
  assert.equal(
    officialAccountRole({
      useCustomProvider: false,
      authAccount: { accountName: "xusen.online", currentModel: "gpt-5.6-terra" }
    }),
    "hero"
  )
})

test("已选 Enjoy 档案：官方 inspect 降为旁注，即使仍带着旧账号名", () => {
  assert.equal(
    officialAccountRole({
      useCustomProvider: true,
      authAccount: { accountName: "xusen.online", currentModel: "gpt-5.6-terra" }
    }),
    "aside"
  )
})

test("没有 inspect 就不画账号区", () => {
  assert.equal(officialAccountRole({ useCustomProvider: false }), "hidden")
  assert.equal(officialAccountRole({ useCustomProvider: true }), "hidden")
})

test("绑了档案还在拉 inspect：旁注占位，不要先闪官方名", () => {
  assert.equal(officialAccountRole({ useCustomProvider: true }, true), "aside")
  assert.equal(officialAccountRole({ useCustomProvider: false }, true), "hero")
})

test("官方旁注是虚线盒文案，不摊邮箱或账号名", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(dir, "agent-tool-account-aside.tsx"), "utf8")
  assert.ok(src.includes("officialAccountAside"))
  assert.ok(src.includes("border-dashed"))
  assert.ok(!src.includes("accountName"))
  assert.ok(!src.includes("email"))
  assert.ok(!src.includes("{name}"))
})

test("官方账号 Hero 决策面不摊 authMethod / OAuth 原文", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(dir, "agent-tool-account-panel.tsx"), "utf8")
  assert.ok(!src.includes("account.authMethod"), "Hero still renders raw authMethod")
  assert.ok(!src.includes("OAuth"), "Hero still contains OAuth")
})
