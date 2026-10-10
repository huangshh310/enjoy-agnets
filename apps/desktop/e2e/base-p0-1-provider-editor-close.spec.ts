/**
 * 「改密钥」抽屉：两条入口 × 取消 / × / Esc 都能关上，且能再打开。
 * from=chat 关完回到原会话，草稿还在。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, hideOverlays, launchEnjoy, skipGuideIfOpen, snap } from "./base-p0-1-launch"

const CLOSES = [
  { name: "cancel", close: async (window: Page) => window.getByTestId("provider-editor-cancel").click() },
  { name: "x", close: async (window: Page) => window.getByTestId("provider-editor-close").click() },
  { name: "esc", close: async (window: Page) => window.keyboard.press("Escape") }
] as const

function keyEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: mkdtempSync(join(tmpdir(), "enjoy-p01-edit-")),
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ...extra
  }
}

async function openChat(window: Page): Promise<void> {
  await skipGuideIfOpen(window)
  await hideOverlays(window)
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
}

function editorDrawer(window: Page) {
  return window.locator("[data-settings-drawer='open']")
}

async function expectEditorClosed(window: Page): Promise<void> {
  await expect(editorDrawer(window)).toHaveCount(0, { timeout: 8_000 })
  await expect(window.getByTestId("provider-key-input")).toHaveCount(0)
}

for (const method of CLOSES) {
  test(`聊天条改密钥：${method.name} 关上并回到草稿，还能再开`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "rejected" }))
    try {
      await openChat(window)
      await window.getByTestId("composer-input").fill("hello close drawer")
      await window.getByTestId("composer-input").press("Enter")
      const notice = window.getByTestId("thread-credential-invalid-notice")
      await expect(notice).toBeVisible({ timeout: 12_000 })
      await notice.getByTestId("thread-credential-invalid-notice-action").click()
      await expect(window.getByTestId("provider-key-input")).toBeVisible({ timeout: 12_000 })
      await expect
        .poll(() => window.evaluate(() => location.hash), { timeout: 8_000 })
        .toMatch(/edit=.*focus=key.*from=chat|from=chat.*edit=/)
      await method.close(window)
      await expectEditorClosed(window)
      await expect
        .poll(() => window.evaluate(() => location.hash.replace(/\?.*$/, "")), { timeout: 8_000 })
        .toBe("#/")
      await expect(window.getByTestId("composer-input")).toHaveValue("hello close drawer")
      await expect(window.getByTestId("thread-credential-invalid-notice")).toBeVisible({
        timeout: 8_000
      })
      await snap(window, `p0-1-editor-closed-chat-${method.name}`)
      await window.getByTestId("thread-credential-invalid-notice-action").click()
      await expect(window.getByTestId("provider-key-input")).toBeVisible({ timeout: 12_000 })
    } finally {
      await app.close()
    }
  })

  test(`列表改密钥：${method.name} 清掉 URL 且能再开`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_CREDENTIAL: "invalid" }))
    try {
      await openChat(window)
      await hideOverlays(window)
      await window.evaluate(() => {
        location.hash = "#/settings/providers"
      })
      const list = window.getByTestId("providers-configured-list")
      await list.waitFor({ timeout: 12_000 })
      await window.getByTestId("credential-fix-key").click()
      await expect(window.getByTestId("provider-key-input")).toBeVisible({ timeout: 12_000 })
      await expect
        .poll(() => window.evaluate(() => location.hash), { timeout: 8_000 })
        .toMatch(/edit=.*focus=key|focus=key.*edit=/)
      await method.close(window)
      await expectEditorClosed(window)
      await expect
        .poll(() => window.evaluate(() => location.hash), { timeout: 8_000 })
        .toMatch(/settings\/providers/)
      const hash = await window.evaluate(() => location.hash)
      expect(hash).not.toMatch(/[?&]edit=/)
      expect(hash).not.toMatch(/[?&]focus=/)
      expect(hash).not.toMatch(/[?&]from=/)
      await snap(window, `p0-1-editor-closed-list-${method.name}`)
      await window.getByTestId("credential-fix-key").click()
      await expect(window.getByTestId("provider-key-input")).toBeVisible({ timeout: 12_000 })
    } finally {
      await app.close()
    }
  })
}
