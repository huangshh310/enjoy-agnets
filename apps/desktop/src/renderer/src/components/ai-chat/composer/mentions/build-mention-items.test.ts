import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildAtMentionItems,
  buildSlashMentionItems,
  type SlashBuiltinCopy,
  type SurfaceCopy
} from "./build-mention-items.ts"
import { rememberSkillCatalog, takeComposerSkillChips } from "./composer-skill-chips.ts"

const copy: SurfaceCopy = {
  explore: { label: "探索", description: "只读" },
  execute: { label: "执行", description: "可写" }
}

const builtin: SlashBuiltinCopy = {
  compactDescription: "Summarize older context",
  builtinTag: "Built-in"
}

test("斜杠列出 compact、探索/执行与已安装技能，不列四态协议名", () => {
  takeComposerSkillChips()
  rememberSkillCatalog(
    [
      {
        id: "s",
        name: "Summarize",
        scope: "global",
        directoryPath: "/skills/summarize",
        skillFilePath: "/skills/summarize/SKILL.md"
      }
    ],
    "/repo"
  )
  const items = buildSlashMentionItems("", copy, builtin)
  assert.equal(
    items.some((item) => item.kind === "command" && item.name === "compact"),
    true
  )
  assert.equal(
    items.some((item) => item.kind === "mode" && item.slash === "explore" && item.mode === "plan"),
    true
  )
  assert.equal(
    items.some((item) => item.kind === "mode" && item.slash === "execute" && item.mode === "agent"),
    true
  )
  assert.equal(
    items.some((item) => item.kind === "mode" && item.mode === "ask"),
    false
  )
  assert.equal(
    items.some((item) => item.kind === "skill" && item.skill.slash === "summarize"),
    true
  )
})

test("查询 compact 只命中压缩命令", () => {
  takeComposerSkillChips()
  const items = buildSlashMentionItems("comp", copy, builtin)
  assert.equal(items.length, 1)
  assert.equal(items[0]?.kind, "command")
})

test("@ 发现含文件、文档、技能，网页 muted", () => {
  takeComposerSkillChips()
  rememberSkillCatalog(
    [
      {
        id: "s",
        name: "读代码",
        scope: "global",
        directoryPath: "/skills/read",
        skillFilePath: "/skills/read/SKILL.md"
      }
    ],
    "/repo"
  )
  const items = buildAtMentionItems(
    "",
    [{ path: "src/auth/login.ts", name: "login.ts", kind: "file" }],
    [{ path: "src/auth/login.ts", name: "login.ts", kind: "file" }],
    [{ id: "d1", path: "docs/login.md", name: "登录流程说明" }]
  )
  assert.equal(items.some((item) => item.kind === "file"), true)
  assert.equal(items.some((item) => item.kind === "doc" && item.name === "登录流程说明"), true)
  assert.equal(items.some((item) => item.kind === "skill"), true)
  assert.equal(items.some((item) => item.kind === "web" && item.muted), true)
  assert.equal(items.some((item) => item.kind === "desktop"), false)
})

test("电脑操控开时探索/执行都列 @桌面，关则不列", () => {
  takeComposerSkillChips()
  const withDesktop = buildAtMentionItems("", [], [], [], [], [], true)
  const without = buildAtMentionItems("桌面", [], [], [], [], [], false)
  const host = withDesktop.find((item) => item.kind === "desktop" && item.role === "host")
  assert.equal(host?.token, "桌面")
  assert.equal(host?.id, "desktop:host")
  assert.equal(without.some((item) => item.kind === "desktop"), false)
})

test("@ 应用行带来源名单的展示名与稳 appKey，无稳键仍可出现", () => {
  takeComposerSkillChips()
  const apps = [
    {
      displayName: "计算器",
      appKey: "com.apple.calculator",
      appKeySource: "bundleId" as const,
      stable: true
    },
    { displayName: "未识别窗口", appKey: "", stable: false, pid: 18422 }
  ]
  const calc = buildAtMentionItems("计算", [], [], [], [], [], true, apps).find(
    (item) => item.kind === "desktop" && item.role === "app" && item.token === "计算器"
  )
  const weak = buildAtMentionItems("未识别", [], [], [], [], [], true, apps).find(
    (item) => item.kind === "desktop" && item.pid === 18422
  )
  assert.equal(calc?.appKey, "com.apple.calculator")
  assert.equal(calc?.stable, true)
  assert.equal(weak?.stable, false)
  assert.equal(weak?.appKey, "")
})

test("空 @ 不造假应用，查询 NotInstalled 也对不上", () => {
  takeComposerSkillChips()
  const empty = buildAtMentionItems("", [], [], [], [], [], true, [])
  assert.equal(empty.filter((item) => item.kind === "desktop").length, 1)
  const fake = buildAtMentionItems("NotInstalled", [], [], [], [], [], true, [])
  assert.equal(fake.some((item) => item.kind === "desktop" && item.role === "app"), false)
})

test("@ 提及在空查询时列出已连 MCP 服务", () => {
  takeComposerSkillChips()
  const roots = [{ path: "src", name: "src", kind: "directory" as const }]
  const files = [{ path: "src/index.ts", name: "index.ts", kind: "file" as const }]
  const mcps = [{ kind: "mcp" as const, id: "mcp:github", name: "github", description: "GitHub API" }]

  const items = buildAtMentionItems("", roots, files, [], mcps)
  assert.equal(items.some((i) => i.kind === "file" && i.name === "src"), true)
  assert.equal(items.some((i) => i.kind === "mcp" && i.name === "github"), true)
})
