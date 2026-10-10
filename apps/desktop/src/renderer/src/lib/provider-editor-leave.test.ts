import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldLeaveProviderEditorToChat, stripProviderEditorSearch } from "./provider-editor-leave.ts"

test("关抽屉清掉 edit / focus / from，留下无关 search", () => {
  assert.deepEqual(
    stripProviderEditorSearch({
      edit: "prv_1",
      focus: "key",
      from: "chat",
      tab: "configured",
      tool: "claude"
    }),
    { tab: "configured", tool: "claude" }
  )
})

test("from=chat / 向导关抽屉回会话；列表入口留在供应商页", () => {
  assert.equal(shouldLeaveProviderEditorToChat("chat"), true)
  assert.equal(shouldLeaveProviderEditorToChat("setup-guide"), true)
  assert.equal(shouldLeaveProviderEditorToChat(undefined), false)
  assert.equal(shouldLeaveProviderEditorToChat("agent"), false)
})
