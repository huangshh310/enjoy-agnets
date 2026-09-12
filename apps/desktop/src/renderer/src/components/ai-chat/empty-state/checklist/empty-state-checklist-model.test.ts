import assert from "node:assert/strict"
import { test } from "node:test"
import { pickMissingCta, shouldExpandMissing, splitEmptyStateTools } from "./empty-state-checklist-model.ts"

test("空态只列本机 CLI：去掉 Enjoy 本地、技能-only、即将推出", () => {
  const { ready, missing } = splitEmptyStateTools([
    { id: "enjoy-local", status: "ready" },
    { id: "claude", status: "ready" },
    { id: "cursor", status: "missing" },
    { id: "gemini", status: "missing", comingSoon: false },
    { id: "hermes", status: "comingSoon", comingSoon: true },
    { id: "skill-pack", status: "ready", skillOnly: true }
  ])
  assert.deepEqual(
    ready.map((item) => item.id),
    ["claude"]
  )
  assert.deepEqual(
    missing.map((item) => item.id),
    ["cursor", "gemini"]
  )
})

test("缺口行只给一个 CTA：npm/brew 安装，其余复制", () => {
  assert.equal(pickMissingCta({ installKind: "npm" }), "install")
  assert.equal(pickMissingCta({ installKind: "brew" }), "install")
  assert.equal(pickMissingCta({ installKind: "copy" }), "copy")
  assert.equal(pickMissingCta({}), "copy")
})

test("CLI-B：Pi 一键，Hermes / 自定义仅复制，不假就绪", () => {
  const { missing } = splitEmptyStateTools([
    { id: "pi", status: "missing", installKind: "npm" },
    { id: "hermes", status: "missing", installKind: "copy" },
    { id: "custom:my-acp", status: "missing" }
  ])
  assert.deepEqual(
    missing.map((item) => item.id),
    ["pi", "hermes", "custom:my-acp"]
  )
  assert.equal(pickMissingCta({ installKind: "npm" }), "install")
  assert.equal(pickMissingCta({ installKind: "copy" }), "copy")
  assert.equal(pickMissingCta({}), "copy")
})

test("开始面缺口下拉一律默认折叠，避免挡住输入框", () => {
  assert.equal(shouldExpandMissing(7, 5), false)
  assert.equal(shouldExpandMissing(0, 5), false)
  assert.equal(shouldExpandMissing(0, 0), false)
})
