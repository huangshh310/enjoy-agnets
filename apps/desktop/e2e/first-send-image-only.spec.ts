/**
 * leo #155 BLOCK：气泡带图不够，必须断言模型（stub）真收到了图（attached:<名>）。
 * luna 巡检（main b91d42d）：只贴图片不打字，蓝色发送键点了 / 回车都没反应、图留在输入框、无提示。
 * 只图发送：新对话（建会话窗内排队首发）回车、已有会话点按钮，都要直接发出、带图入库、输入框清空；
 * 空输入框时发送键置灰（与发送同一判定 composerCanSend）。
 */
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { closeForRelaunch } from "./approval-restart-helpers"

const mainEntry = join(process.cwd(), "out/main/index.js")
// 160x100 蓝色 PNG（截图里看得见）
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

test("只图发送：新对话回车、已有会话点按钮，都直接发出，图随消息走，输入框清空", async () => {
  const testInfo = test.info()
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const shots = process.env.ENJOY_E2E_SHOTS_DIR || testInfo.outputPath("shots")
  mkdirSync(shots, { recursive: true })
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await electron.launch({
    args: [mainEntry],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      // 建会话窗拉长：回车落在排队首发路径上。
      ENJOY_DEV_DELAY_SESSION_CREATE_MS: "1500",
      // stub 模型按能看图处理，图才会作为 file part 进模型。
      ENJOY_E2E_STUB_VISION: "1"
    }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    const send = window.locator('[data-testid="composer-send"]').first()
    const stage = window.locator('[data-chat-stage="true"]')
    const chip = window.locator('[data-testid="composer-asset-chip"]')

    // ① 新对话：只贴图，回车。
    await window.locator('[data-testid="sidebar-new-session"]').click()
    // 空输入框：发送键不可点（不亮蓝）。
    await expect(send).toBeDisabled()
    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "only-a.png",
      mimeType: "image/png",
      buffer: PNG
    })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await expect(send).toBeEnabled()
    await window.screenshot({ path: join(shots, "image-only-1-before-enter.png") })
    await composer.click()
    await window.keyboard.press("Enter")
    await expect(stage.locator("[data-thread-message]").first()).toBeVisible({ timeout: 20_000 })
    // 用户气泡带这张图（落库后回显），且这一轮真跑完（stub 回了 stub-ok）。
    await expect(stage.locator('[data-thread-message] img[alt="only-a.png"]').first()).toBeVisible({ timeout: 20_000 })
    // leo MUST 3：模型（stub）真收到了这张图——stub 按收到的 file part 回 attached:<文件名>。
    await expect(stage).toContainText("attached:only-a.png", { timeout: 20_000 })
    await expect(chip).toHaveCount(0)
    await window.screenshot({ path: join(shots, "image-only-2-new-session-sent.png") })

    // ② 同一（已有）会话：只贴图，点发送键。
    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "only-b.png",
      mimeType: "image/png",
      buffer: PNG
    })
    await expect(chip).toHaveCount(1, { timeout: 8_000 })
    await expect(send).toBeEnabled({ timeout: 20_000 })
    await send.click()
    // 用户气泡带这张图（落库后回显），且这一轮真跑完（stub 回了 stub-ok）。
    await expect(stage.locator('[data-thread-message] img[alt="only-b.png"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(stage).toContainText("attached:only-b.png", { timeout: 20_000 })
    await expect(chip).toHaveCount(0)
    await expect(send).toBeDisabled({ timeout: 20_000 })
    await window.screenshot({ path: join(shots, "image-only-3-existing-session-sent.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

async function launchStub(extra: Record<string, string>) {
  const playwright = await import("playwright")
  const electron = playwright._electron
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await electron.launch({
    args: [mainEntry],
    cwd: process.cwd(),
    timeout: 45_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_STUB_VISION: "1",
      ...extra
    }
  })
  const window = await app.firstWindow()
  await window.waitForSelector("#root", { timeout: 20_000 })
  await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
    timeout: 20_000
  })
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
  await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
  return { app, window }
}

/** 真粘贴：往输入框派一个带图片文件的 paste 事件（走 onPaste → planComposerPaste → 附件）。 */
async function pasteImage(window: import("@playwright/test").Page, name: string) {
  await window.locator('[data-testid="composer-input"] textarea, textarea[data-testid="composer-input"]').first().evaluate(
    (el, input) => {
      const bytes = Uint8Array.from(atob(input.b64), (c) => c.charCodeAt(0))
      const dt = new DataTransfer()
      dt.items.add(new File([bytes], input.name, { type: "image/png" }))
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }))
    },
    { b64: PNG.toString("base64"), name }
  )
}

test("jojo P2：新对话里粘图后焦点留在输入框，直接回车就发出（不用再点输入框）", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const shots = process.env.ENJOY_E2E_SHOTS_DIR || test.info().outputPath("shots")
  mkdirSync(shots, { recursive: true })
  const { app, window } = await launchStub({})
  try {
    const stage = window.locator('[data-chat-stage="true"]')
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await window.locator('[data-testid="composer-input"]').click()
    await pasteImage(window, "pasted.png")
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
    // 焦点仍在输入框（不是 body / 附件托盘）。
    await expect
      .poll(() => window.evaluate(() => Boolean(document.activeElement?.closest('[data-testid="composer-input"]')) || document.activeElement?.getAttribute("data-testid") === "composer-input"), { timeout: 5_000 })
      .toBe(true)
    await window.screenshot({ path: join(shots, "image-only-p2-pasted-focused.png") })
    await window.keyboard.press("Enter")
    await expect(stage).toContainText("attached:pasted.png", { timeout: 20_000 })
    await window.screenshot({ path: join(shots, "image-only-p2-enter-sent.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("jojo P3：带图发送失败（看门狗）→ 红卡写「文字和图片已放回输入框」，图还在输入框", async () => {
  test.setTimeout(120_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const shots = process.env.ENJOY_E2E_SHOTS_DIR || test.info().outputPath("shots")
  mkdirSync(shots, { recursive: true })
  const { app, window } = await launchStub({ ENJOY_E2E_SEND_WATCHDOG: "1", ENJOY_E2E_CHAT_READY: "key" })
  try {
    const composer = window.locator('[data-testid="composer-input"]')
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "fail.png", mimeType: "image/png", buffer: PNG })
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 8_000 })
    await composer.click()
    await window.keyboard.type("看失败")
    await window.keyboard.press("Enter")
    const banner = window.locator('[data-testid="thread-error-banner"]')
    await expect(banner).toContainText("这次没发出去", { timeout: 15_000 })
    await expect(banner).toContainText("文字和图片已放回输入框")
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1)
    await window.screenshot({ path: join(shots, "image-only-p3-failed-copy.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
