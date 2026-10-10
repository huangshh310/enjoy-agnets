/**
 * none 夹具：起始无路线；UI 存密钥后同会话 ready + adoptedHint，toast 只出一次。
 */
import { expect, test } from "@playwright/test"
import {
  canLaunchElectron,
  hideOverlays,
  launchEnjoy,
  openAddKeyForm,
  openConnectModelStep,
  snap,
  snapThemes
} from "./base-p0-1-launch"

const TOAST_ID = "adopted-default-route-toast"
const TOAST_ZH = "之后的新对话默认用"

test("none → 保存密钥后同会话 ready，adoptedHint 只出一次", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none",
    ENJOY_E2E_CREDENTIAL: "ok"
  })
  try {
    await openConnectModelStep(window)
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getChatReadiness()?.ready ?? null), {
        timeout: 12_000
      })
      .toBe(false)
    await openAddKeyForm(window)
    const form = window.getByRole("dialog", { name: "添加 DeepSeek" })
    const keyBox = form.getByTestId("provider-simple-fields").locator('input[type="password"]').first()
    await keyBox.fill("sk-e2e-adopt-once")
    await form.getByTestId("provider-editor-save").click()
    await expect
      .poll(
        async () =>
          window.evaluate(() => {
            const snap = window.__enjoyE2e?.getChatReadiness()
            return Boolean(snap?.ready && snap.apiKeys.length > 0 && snap.adoptedHint?.name)
          }),
        { timeout: 15_000 }
      )
      .toBe(true)
    const toast = window.getByTestId(TOAST_ID)
    await expect(toast).toBeVisible({ timeout: 8_000 })
    await expect(toast).toContainText(TOAST_ZH)
    await expect(toast).toHaveCount(1)
    await hideOverlays(window)
    await snap(window, "p0-1-adopt-default-route-toast")
    await snapThemes(window, "p0-1-adopt-default-route-toast")
    await window.evaluate(() => {
      window.dispatchEvent(new Event("focus"))
    })
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getChatReadiness()?.ready ?? false), {
        timeout: 8_000
      })
      .toBe(true)
    await expect(window.getByTestId(TOAST_ID)).toHaveCount(1)
  } finally {
    await app.close()
  }
})
