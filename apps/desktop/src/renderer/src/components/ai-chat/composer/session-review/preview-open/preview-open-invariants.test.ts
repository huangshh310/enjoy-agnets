/**
 * P0-F 视觉锁：完成条次级「在浏览器打开」，走系统浏览器。
 * 真源 design/previews/p0-f-preview-open.html（9a1a4ca）。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../../i18n/catalogs/zh/chat.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/p0-f-preview-open.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("p0-f-preview-open.html 必须在仓内（9a1a4ca）")
}

const preview = readPreviewHtml()
const files = {
  actions: readFileSync(join(dir, "../session-review-actions.tsx"), "utf8"),
  button: readFileSync(join(dir, "session-preview-open-button.tsx"), "utf8"),
  toast: readFileSync(join(dir, "session-preview-toast.tsx"), "utf8"),
  open: readFileSync(join(dir, "open-preview-in-browser.ts"), "utf8"),
  pick: readFileSync(join(dir, "pick-preview-target.ts"), "utf8"),
  composer: readFileSync(join(dir, "../composer-session-review.tsx"), "utf8"),
  pane: readFileSync(join(dir, "../../../right-pane/open-pane.ts"), "utf8"),
  main: readFileSync(join(dir, "../../../../../../../main/services/workspace-open-preview.ts"), "utf8"),
  plan: readFileSync(
    join(dir, "../../../../../../../main/services/workspace-open-preview-plan.ts"),
    "utf8"
  )
}

test("预览真源仍在仓内，四锁与禁用文案都在", () => {
  assert.ok(preview.includes("【视觉真源】P0-F"))
  assert.ok(preview.includes("在浏览器打开"))
  assert.ok(preview.includes("暂无可预览页面"))
  assert.ok(preview.includes("已在浏览器打开"))
  assert.ok(preview.includes("shell.openExternal"))
  assert.ok(preview.includes("只读可开"))
  assert.ok(preview.includes("不嵌 Chromium"))
  assert.ok(preview.includes("不用"))
  assert.ok(preview.includes("webview / 内嵌 Chromium"))
})

test("中英词表与预览同文，不用 Preview / Live / 协议词", () => {
  assert.equal(zhChat.sessionReviewOpenPreview, "在浏览器打开")
  assert.equal(zhChat.sessionReviewOpenPreviewHint, "暂无可预览页面")
  assert.equal(zhChat.sessionReviewOpenPreviewDone, "已在浏览器打开")
  assert.equal(enChat.sessionReviewOpenPreview, "Open in browser")
  assert.equal(enChat.sessionReviewOpenPreviewHint, "No page to preview yet")
  assert.equal(enChat.sessionReviewOpenPreviewDone, "Opened in browser")
  assert.doesNotMatch(zhChat.sessionReviewOpenPreview, /Preview|Live|webview|Chromium|ACP/i)
  assert.doesNotMatch(enChat.sessionReviewOpenPreview, /Live preview|embedded|webview|ACP/i)
})

test("完成条次级钮在审查主钮左边，禁用不藏", () => {
  assert.ok(files.actions.includes("SessionPreviewOpenButton"))
  assert.ok(files.actions.includes("onOpenReview"))
  assert.ok(files.button.includes("sessionReviewOpenPreviewHint"))
  assert.ok(files.button.includes("disabled"))
  assert.ok(!files.button.includes("return null"))
})

test("点击走 openPreview / openExternal，不进右栏 webview，不起 dev server", () => {
  assert.ok(files.open.includes("workspace.openPreview"))
  assert.ok(!files.open.includes("openBrowserUrl"))
  assert.ok(!files.open.includes("revealRightPane"))
  assert.ok(files.main.includes("shell.openExternal"))
  assert.ok(!files.main.includes("BrowserView"))
  assert.ok(!files.main.includes("webviewTag"))
  assert.ok(!files.plan.includes("vite"))
  assert.ok(!files.plan.includes("BrowserView"))
  assert.ok(!files.pick.includes("vite"))
  assert.ok(!files.composer.includes("openBrowserUrl"))
})

test("探索态不按 mode 禁用预览；右栏浏览器仍是内嵌通道", () => {
  assert.ok(!files.button.includes("surfaceForMode"))
  assert.ok(!files.button.includes('mode === "plan"'))
  assert.ok(!files.button.includes('mode === "ask"'))
  assert.ok(files.pane.includes('revealRightPane("browser"'))
})

test("成功 toast 短句贴完成条，不进空态", () => {
  assert.ok(files.toast.includes("sessionReviewOpenPreviewDone"))
  assert.ok(files.composer.includes("SessionPreviewToast"))
  assert.ok(!files.composer.includes("SkillSourcePullStrip"))
})
