import assert from "node:assert/strict"
import { test } from "node:test"
import { groupMentionItems } from "./mention-groups.ts"
import type { MentionItem } from "./mention-items.ts"

test("斜杠按模式、工作区、个人分组，空组丢掉", () => {
  const items: MentionItem[] = [
    { kind: "command", id: "command:compact", name: "compact", description: "压缩", tag: "内置" },
    { kind: "mode", id: "mode:plan", mode: "plan", label: "规划", description: "只读" },
    {
      kind: "skill",
      id: "s1",
      skill: { id: "s1", name: "Summarize", slash: "summarize", scope: "global" }
    },
    {
      kind: "skill",
      id: "s2",
      skill: { id: "s2", name: "Review", slash: "review", scope: "workspace" }
    }
  ]
  const groups = groupMentionItems("slash", items)
  assert.deepEqual(
    groups.map((group) => group.id),
    ["builtin", "workspace", "personal"]
  )
  assert.equal(groups[0]?.items[0]?.kind, "command")
  assert.equal(groupMentionItems("at", []).length, 0)
})
