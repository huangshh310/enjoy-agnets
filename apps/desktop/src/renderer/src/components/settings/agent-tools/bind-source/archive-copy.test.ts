/**
 * 档案副标题：主行不夹模型，品牌名不和档案名重复。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { archiveBrandName, archiveSubtitle } from "./archive-copy.ts"

const copy: Record<string, string> = {
  "settings.agentTools.bindAccountNoKey": "还没保存密钥",
  "settings.agentTools.bindAccountBrandArchive": "{brand} 档案",
  "settings.agentTools.bindAccountKeySaved": "密钥已保存"
}

function t(key: string, vars?: Record<string, string | number>): string {
  let text = copy[key] ?? key
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

test("deepseek kind 品牌是 DeepSeek", () => {
  assert.equal(archiveBrandName("deepseek"), "DeepSeek")
  assert.equal(archiveBrandName("custom"), undefined)
})

test("用户档案名和品牌不同时，副行写品牌档案", () => {
  assert.equal(
    archiveSubtitle({ kind: "deepseek", name: "deep", hasKey: true }, t),
    "DeepSeek 档案"
  )
})

test("档案名已经是品牌时，副行只写密钥已保存", () => {
  assert.equal(
    archiveSubtitle({ kind: "deepseek", name: "DeepSeek", hasKey: true }, t),
    "密钥已保存"
  )
})

test("没密钥时不假装已接通", () => {
  assert.equal(
    archiveSubtitle({ kind: "deepseek", name: "deep", hasKey: false }, t),
    "还没保存密钥"
  )
})
