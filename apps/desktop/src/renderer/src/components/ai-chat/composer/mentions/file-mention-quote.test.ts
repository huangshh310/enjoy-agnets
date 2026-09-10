import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clipMentionContent,
  MENTION_SNIPPET_MAX,
  quoteUnreadableFile,
  quoteWorkspaceFile,
  quoteWorkspaceFolder
} from "./file-mention-quote.ts"

test("文件引用带路径和正文", () => {
  const quote = quoteWorkspaceFile("apps/a.ts", "export const a = 1")
  assert.equal(quote.type, "file")
  assert.equal(quote.title, "apps/a.ts")
  assert.equal(quote.content, "export const a = 1")
})

test("目录引用列出条目，不是假内容", () => {
  const quote = quoteWorkspaceFolder("apps", ["desktop/", "package.json"])
  assert.equal(quote.title, "apps/")
  assert.match(quote.content ?? "", /Directory apps/)
  assert.match(quote.content ?? "", /- desktop\//)
})

test("超长正文截断并标明 read_file", () => {
  const clipped = clipMentionContent("n".repeat(MENTION_SNIPPET_MAX + 80))
  assert.ok(clipped.length <= MENTION_SNIPPET_MAX)
  assert.match(clipped, /truncated; use read_file/)
})

test("读失败仍给出真实路径，让模型去读盘", () => {
  const quote = quoteUnreadableFile("bin/app", "binary")
  assert.match(quote.content ?? "", /Binary/)
  assert.equal(quote.metadata?.path, "bin/app")
})
