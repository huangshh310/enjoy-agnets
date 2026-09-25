import assert from "node:assert/strict"
import { test } from "node:test"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { desktopMentionInsert, readDesktopMentionBias } from "./read-desktop-mention-bias.ts"

const APPS: DesktopMentionApp[] = [
  {
    displayName: "计算器",
    appKey: "com.apple.calculator",
    appKeySource: "bundleId",
    stable: true
  },
  {
    displayName: "未识别窗口",
    appKey: "",
    stable: false,
    pid: 18422
  }
]

test("@桌面 / 旧 @电脑 / Desktop 都偏宿主", () => {
  assert.deepEqual(readDesktopMentionBias("@桌面 打开计算器", APPS), { kind: "host" })
  assert.deepEqual(readDesktopMentionBias("@电脑 试一下", APPS), { kind: "host" })
  assert.deepEqual(readDesktopMentionBias("use @Desktop please", APPS), { kind: "host" })
})

test("@计算器 绑稳 appKey；点别的 app 是另一条偏置", () => {
  assert.deepEqual(readDesktopMentionBias("@计算器 把 1+1 算出来", APPS), {
    kind: "app",
    displayName: "计算器",
    appKey: "com.apple.calculator",
    stable: true
  })
  assert.equal(readDesktopMentionBias("@Safari 打开", APPS), null)
})

test("无稳键应用可提及，bias.stable=false", () => {
  const bias = readDesktopMentionBias("@未识别窗口 点一下", APPS)
  assert.equal(bias?.kind, "app")
  if (bias?.kind === "app") {
    assert.equal(bias.stable, false)
    assert.equal(bias.appKey, "")
  }
})

test("名单外 token 不造假应用", () => {
  assert.equal(readDesktopMentionBias("@NotInstalled 安装", APPS), null)
})

test("插入宿主永远写 @桌面", () => {
  assert.equal(desktopMentionInsert({ role: "host", token: "电脑" }), "@桌面 ")
  assert.equal(desktopMentionInsert({ role: "app", token: "计算器" }), "@计算器 ")
})
