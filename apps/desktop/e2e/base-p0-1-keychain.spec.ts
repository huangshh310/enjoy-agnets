/**
 * ENJOY_E2E_KEYCHAIN=unavailable：加钥表单顶栏提示 + 禁保存，草稿留下。
 * 夹具未落地（secretStorageAvailable !== false）时 skip，不要假装测过。
 */
import { expect, test } from "@playwright/test"
import { canLaunchElectron, launchEnjoy, openConnectModelStep } from "./base-p0-1-launch"

const KEYCHAIN_COPY = "这台电脑没有可用的系统钥匙串，密钥暂时存不了。装好系统钥匙串（如 GNOME 密钥环）后重启 Enjoy 再试。"

test("钥匙串不可用时向导加钥步与添加表单提示且禁保存", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none",
    ENJOY_E2E_KEYCHAIN: "unavailable"
  })
  try {
    await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 20_000 })
    const available = await window.evaluate(() => window.__enjoyE2e?.getChatReadiness()?.secretStorageAvailable)
    test.skip(
      available !== false,
      "ENJOY_E2E_KEYCHAIN=unavailable fixture not landed yet (secretStorageAvailable !== false)"
    )

    await openConnectModelStep(window)
    const wizardNotice = window.getByTestId("secret-write-notice")
    await expect(wizardNotice).toBeVisible()
    await expect(wizardNotice).toHaveAttribute("data-code", "KEYCHAIN_UNAVAILABLE")
    await expect(wizardNotice).toHaveText(KEYCHAIN_COPY)
    await expect(wizardNotice).not.toContainText(/keychain encryption|isEncryptionAvailable/i)

    await window.getByTestId("connect-model-api_key").click()
    await window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, {
      timeout: 8_000
    })
    await window.evaluate(() => {
      window.__enjoyE2e?.hideGuide()
    })
    await expect(window.getByTestId("provider-pick-panel")).toBeVisible()
    await window.getByTestId("provider-pick-deepseek").click()
    await expect(window.getByTestId("provider-simple-fields")).toBeVisible()
    const formNotice = window.getByTestId("secret-write-notice")
    await expect(formNotice).toBeVisible()
    await expect(formNotice).toHaveAttribute("data-code", "KEYCHAIN_UNAVAILABLE")
    await expect(formNotice).toHaveText(KEYCHAIN_COPY)
    const save = window.getByTestId("provider-editor-save")
    await expect(save).toBeDisabled()
    const keyBox = window.getByTestId("provider-simple-fields").locator('input[type="password"]')
    await keyBox.fill("sk-keep-typed-value")
    await expect(keyBox).toHaveValue("sk-keep-typed-value")
    await expect(save).toBeDisabled()
    await expect(window.getByTestId("provider-simple-fields")).toBeVisible()
    await expect(window.getByTestId("secret-write-notice")).toBeVisible()
  } finally {
    await app.close()
  }
})
