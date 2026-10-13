/**
 * luna P3：收件箱工具短句与会话标题兜底。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhInboxPages } from "../../../i18n/catalogs/zh/pages-inbox.ts"
import { enInboxPages } from "../../../i18n/catalogs/en/pages-inbox.ts"
import { inboxSessionTitle, inboxToolPhrase, inboxToolPhraseKey, inboxToolsPhrase } from "./inbox-tool-phrase.ts"

const zh = (key: string) => (zhInboxPages as Record<string, string>)[key.replace("pages.inbox.", "")] ?? key
const en = (key: string) => (enInboxPages as Record<string, string>)[key.replace("pages.inbox.", "")] ?? key

test("工具名 → 短句（含未知兜底）", () => {
  assert.equal(inboxToolPhrase("bash", zh), "要运行命令")
  assert.equal(inboxToolPhrase("write_file", zh), "要改文件")
  assert.equal(inboxToolPhrase("edit_file", zh), "要改文件")
  assert.equal(inboxToolPhrase("edit", zh), "要改文件")
  assert.equal(inboxToolPhrase("code_mode", zh), "要运行代码")
  assert.equal(inboxToolPhrase("mcp__weird_tool", zh), "等你确认")
  assert.equal(inboxToolPhrase(undefined, zh), "等你确认")
  assert.equal(inboxToolPhrase("bash", en), "Wants to run a command")
  assert.equal(inboxToolPhrase("nope", en), "Waiting for you")
})

test("每个短句键 zh / en 都有文案", () => {
  for (const name of ["bash", "write_file", "code_mode", "x"]) {
    const key = inboxToolPhraseKey(name)
    assert.notEqual(zh(key), key)
    assert.notEqual(en(key), key)
  }
})

test("多工具：只列认得的、去重；一个都不认得给 null，不露原名", () => {
  assert.equal(inboxToolsPhrase(["bash", "bash", "write_file", "read_file"], zh), "要运行命令、要改文件")
  assert.equal(inboxToolsPhrase(["read_file", "grep"], zh), null)
})

test("会话标题：空 / ses_ id 换成未命名对话", () => {
  assert.equal(inboxSessionTitle("stub-title", zh), "stub-title")
  assert.equal(inboxSessionTitle("ses_abc123", zh), "未命名对话")
  assert.equal(inboxSessionTitle("", en), "Untitled chat")
})
