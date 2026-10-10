import assert from "node:assert/strict"
import { test } from "node:test"
import { pendingApprovalTargetShort } from "./pending-approval-target-short.ts"

test("write_file 只取 basename，不含目录", () => {
  assert.equal(pendingApprovalTargetShort("write_file", { path: "src/foo/bar.ts" }), "bar.ts")
  assert.equal(pendingApprovalTargetShort("edit_file", { file_path: "C:\\\\tmp\\\\note.txt" }), "note.txt")
})

test("desktop_act 用 appName，缺则省略", () => {
  assert.equal(pendingApprovalTargetShort("desktop_act", { appName: "备忘录", path: "/secret/key" }), "备忘录")
  assert.equal(pendingApprovalTargetShort("desktop_act", { action: "click" }), undefined)
})

test("超长截到 64；无 path 省略；不抄 content", () => {
  const long = `${"a".repeat(80)}.md`
  assert.equal(pendingApprovalTargetShort("write_file", { path: `docs/${long}` })?.length, 64)
  assert.equal(pendingApprovalTargetShort("write_file", { content: "huge" }), undefined)
  assert.equal(pendingApprovalTargetShort("write_file", undefined), undefined)
})
