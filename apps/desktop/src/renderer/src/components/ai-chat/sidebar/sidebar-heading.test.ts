import assert from "node:assert/strict"
import { test } from "node:test"
import { sidebarListHeadingKey } from "./sidebar-heading.ts"

test("扁平列表标题是对话，按项目仍是项目", () => {
  assert.equal(sidebarListHeadingKey("flat"), "chat.chats")
  assert.equal(sidebarListHeadingKey("project"), "chat.projects")
  assert.equal(sidebarListHeadingKey("status"), "chat.projects")
})
