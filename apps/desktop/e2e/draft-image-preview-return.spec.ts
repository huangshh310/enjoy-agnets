/**
 * luna（#153 q153-04）：会话里粘图不发 → 点「新对话」→ 点回原会话，缩略图不能坏（只剩文件名）。
 * 原因：新对话路径清输入框时 revoke 了 blob 预览，而原会话内存草稿还引用它。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/draft-image-return")
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

async function chipImageLoaded(window: Page): Promise<number> {
  return window.evaluate(() => {
    const img = document.querySelector('[data-testid="composer-asset-chip"] img') as HTMLImageElement | null
    return img && img.complete ? img.naturalWidth : 0
  })
}

test("粘图不发 → 新对话 → 切回：缩略图仍能加载（naturalWidth > 0）", async () => {
  test.setTimeout(180_000)
  if (process.env.CI) expect(existsSync(mainEntry), "CI 缺 out/main/index.js").toBe(true)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-dip-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-dip-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  mkdirSync(shots, { recursive: true })
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: "zh",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  })
  try {
    const window = await firstWindow(app)
    const skip = window.getByRole("button", { name: "跳过设置" })
    if ((await skip.count()) > 0) await skip.click()
    // 原会话：先有一条消息（不是可复用的空会话）
    await sendComposer(window, window.locator('[data-testid="composer-input"]'), "hello")
    await window.locator('[data-testid="sidebar-session-row"]', { hasText: "stub" }).first().waitFor({ timeout: 20_000 })
    await window.waitForTimeout(1_500)
    // 粘图不发
    await window.locator('[data-testid="composer-attach"]').setInputFiles({ name: "F.png", mimeType: "image/png", buffer: PNG })
    await window.waitForSelector('[data-testid="composer-asset-chip"] img', { timeout: 8_000 })
    await expect.poll(() => chipImageLoaded(window), { timeout: 8_000 }).toBeGreaterThan(0)
    // 新对话
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(0, { timeout: 10_000 })
    await window.waitForTimeout(1_000)
    // 切回原会话
    await window.locator('[data-testid="sidebar-session-row"]', { hasText: "stub" }).first().click()
    await expect(window.locator('[data-testid="composer-asset-chip"]')).toHaveCount(1, { timeout: 10_000 })
    await expect.poll(() => chipImageLoaded(window), { timeout: 10_000 }).toBeGreaterThan(0)
    await window.screenshot({ path: join(shots, "draft-image-return.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
