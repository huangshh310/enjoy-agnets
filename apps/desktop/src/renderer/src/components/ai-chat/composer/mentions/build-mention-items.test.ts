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
})
