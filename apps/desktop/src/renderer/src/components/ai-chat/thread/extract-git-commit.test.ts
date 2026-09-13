import assert from "node:assert/strict"
import { test } from "node:test"
import { extractGitCommitInfo } from "./extract-git-commit.ts"
import type { ThreadMessage } from "@renderer/stores/chat-store"

test("从助手提交总结文本中提取 Git 提交信息", () => {
  const message = {
    id: "msg_1",
    role: "assistant",
    content: `已经提交并推送到 origin/main。
提交：4f885c3
标题：Add session workflow, recap, mermaid fences, and inbox activity filters
本地 main 已与远程同步，工作区干净。
这次合入包括：
- 会话工作流（旗标/状态/目标/阶段总结）和独立的 session IPC`,
    createdAt: Date.now()
  } as ThreadMessage

  const info = extractGitCommitInfo(message)
  assert.ok(info != null)
  assert.equal(info.hash, "4f885c3")
  assert.equal(info.message, "Add session workflow, recap, mermaid fences, and inbox activity filters")
  assert.equal(info.branch, "main")
  assert.equal(info.remote, "origin/main")
})

test("普通文本不误报 Git 提交", () => {
  const message = {
    id: "msg_2",
    role: "assistant",
    content: "请问需要我为你修改代码吗？",
    createdAt: Date.now()
  } as ThreadMessage

  const info = extractGitCommitInfo(message)
  assert.equal(info, null)
})
