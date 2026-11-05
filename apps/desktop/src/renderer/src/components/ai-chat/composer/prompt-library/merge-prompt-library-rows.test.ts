import assert from "node:assert/strict"
import { test } from "node:test"
import { mergePromptLibraryRows } from "./merge-prompt-library-rows.ts"

test("合并：星标置顶；会话召回进最近；搜滤", () => {
  const { starred, recent } = mergePromptLibraryRows({
    sessionPrompts: ["会话最近一句", "请先列风险"],
    library: [
      {
        id: "pl_1",
        text: "请先列风险",
        starred: true,
        updatedAt: 200
      },
      {
        id: "pl_2",
        text: "跨会话旧提示",
        starred: false,
        updatedAt: 100
      }
    ],
    query: ""
  })
  assert.equal(starred.length, 1)
  assert.equal(starred[0]?.text, "请先列风险")
  assert.ok(recent.some((r) => r.text === "会话最近一句"))
  assert.ok(recent.some((r) => r.text === "跨会话旧提示"))
  assert.ok(!recent.some((r) => r.text === "请先列风险"))

  const filtered = mergePromptLibraryRows({
    sessionPrompts: ["会话最近一句", "请先列风险"],
    library: [
      { id: "pl_1", text: "请先列风险", starred: true, updatedAt: 200 },
      { id: "pl_2", text: "跨会话旧提示", starred: false, updatedAt: 100 }
    ],
    query: "跨会话"
  })
  assert.equal(filtered.starred.length, 0)
  assert.equal(filtered.recent.length, 1)
  assert.equal(filtered.recent[0]?.text, "跨会话旧提示")
})
