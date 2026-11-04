/**
 * Composer 预览 P1：入口位、同槽切换、禁 WYSIWYG/cite 皮、复用气泡 MD。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function read(name: string): string {
  return readFileSync(join(dir, name), "utf8")
}

test("底栏：预览 ghost 在 + 与模型芯片之间", () => {
  const footer = read("composer-footer.tsx")
  const attachAt = footer.indexOf("<ComposerAttachMenu")
  const toggleAt = footer.indexOf("<ComposerPreviewToggle")
  const pickerAt = footer.indexOf("<AgentPicker")
  assert.ok(attachAt >= 0 && toggleAt > attachAt && pickerAt > toggleAt)
})

test("同槽切换：预览开则卸 textarea，关则回 ComposerInput", () => {
  const shell = readFileSync(join(dir, "../ai-chat-composer.tsx"), "utf8")
  assert.match(shell, /previewOpen \? \(/)
  assert.match(shell, /<ComposerPreviewPane/)
  assert.match(shell, /<ComposerInput/)
  assert.match(shell, /handleSend/)
  assert.equal(shell.includes("TipTap"), false)
  assert.equal(shell.includes("ProseMirror"), false)
  assert.equal(shell.includes("contentEditable"), false)
})

test("预览面复用 MarkdownResponse；空态人话", () => {
  const pane = read("composer-preview-pane.tsx")
  assert.match(pane, /MarkdownResponse/)
  assert.match(pane, /composerPreviewEmpty/)
  assert.match(pane, /data-testid="composer-preview-pane"/)
  assert.doesNotMatch(pane, /InlineCitations|WYSIWYG|TipTap|ProseMirror/)
})

test("文案：预览/源码/空态；禁工程词", () => {
  assert.equal(zhChat.composerPreview, "预览")
  assert.equal(zhChat.composerSource, "源码")
  assert.equal(zhChat.composerPreviewEmpty, "写点 Markdown 再预览")
  assert.equal(enChat.composerPreview, "Preview")
  assert.equal(enChat.composerSource, "Source")
  for (const value of [
    zhChat.composerPreview,
    zhChat.composerSource,
    zhChat.composerPreviewEmpty,
    zhChat.composerPreviewHint,
    enChat.composerPreview,
    enChat.composerSource,
    enChat.composerPreviewEmpty,
    enChat.composerPreviewHint
  ]) {
    assert.doesNotMatch(value, /WYSIWYG|TipTap|ProseMirror|InlineCitations|Markdown Preview/i)
  }
})

test("发送关预览；会话记忆模块无 localStorage/settings", () => {
  const shell = readFileSync(join(dir, "../ai-chat-composer.tsx"), "utf8")
  assert.match(shell, /setComposerPreviewOpen\(sessionId, false\)/)
  const mode = read("composer-preview-mode.ts")
  assert.doesNotMatch(mode, /localStorage|settings|persist/)
  assert.match(mode, /Map/)
})
