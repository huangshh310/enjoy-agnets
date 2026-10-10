/**
 * ① ENJOY_E2E_STUB=1 + ENJOY_E2E_KEYCHAIN=unavailable：黄条 + 禁保存。
 * 夹具未落地（#133 未合）时 skip，不要假装测过。
 * ② 写失败红字：e2e 桥强制 KEYCHAIN_UNAVAILABLE，不依赖本机钥匙串。
 */
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, launchEnjoy, openConnectModelStep, snap } from "./base-p0-1-launch"

async function openAddKeyForm(window: Page): Promise<void> {
  await window.getByTestId("connect-model-api_key").click()
  await window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, {
    timeout: 8_000
  })
  // 不要 hideGuide：pauseAt 后 hide 会清掉 paused，首启闸会把向导从介绍页再打开。
  await window.evaluate(() => {
    window.__enjoyE2e?.hideCreateProject()
  })
  await expect(window.getByTestId("provider-pick-panel")).toBeVisible()
  await window.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-testid="provider-pick-deepseek"]')?.click()
  })
  await expect(window.getByTestId("provider-simple-fields")).toBeVisible({ timeout: 8_000 })
}

const PREFLIGHT_TITLE = "这台电脑没有可用的系统钥匙串，暂时没法安全地保存密钥。"
const PREFLIGHT_BODY = "装好系统钥匙串（比如 GNOME 密钥环）后，重启 Enjoy 再来添加。"
const WRITE_FAIL =
  "没存上：系统钥匙串现在用不了，密钥不会以明文保存。请确认钥匙串已解锁后再点保存。"
const SAVE_TIP = "需要系统钥匙串才能保存"

test("① skip-until-#133：夹具不可用时向导与加钥表单黄条且禁保存", async () => {
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
      "skip-until-#133: ENJOY_E2E_KEYCHAIN=unavailable fixture not on main (secretStorageAvailable !== false)"
    )

    await openConnectModelStep(window)
    const wizardNotice = window.getByTestId("secret-write-notice")
    await expect(wizardNotice).toBeVisible()
    await expect(wizardNotice).toHaveAttribute("data-kind", "preflight")
    await expect(wizardNotice).toContainText(PREFLIGHT_TITLE)
    await expect(wizardNotice).toContainText(PREFLIGHT_BODY)
    await expect(wizardNotice).not.toContainText(/libsecret|DBus|keychain encryption|isEncryptionAvailable/i)
    const later = window.getByTestId("connect-model-later")
    await expect(later).toBeEnabled()
    await snap(window, "p0-1-keychain-preflight-wizard")

    await openAddKeyForm(window)
    const form = window.getByRole("dialog", { name: "添加 DeepSeek" })
    const formNotice = form.getByTestId("secret-write-notice")
    await expect(formNotice).toBeVisible()
    await expect(formNotice).toHaveAttribute("data-kind", "preflight")
    await expect(formNotice).toContainText(PREFLIGHT_TITLE)
    const save = form.getByTestId("provider-editor-save")
    await expect(save).toBeDisabled()
    await expect(form.getByTestId("secret-write-save-tip")).toHaveAttribute("title", SAVE_TIP)
    const keyBox = form.getByTestId("provider-simple-fields").locator('input[type="password"]').first()
    await expect(keyBox).toBeEnabled()
    await keyBox.fill("sk-keep-typed-value")
    await expect(keyBox).toHaveValue("sk-keep-typed-value")
    await expect(save).toBeDisabled()
    await expect(form.getByTestId("provider-simple-fields")).toBeVisible()
    await snap(window, "p0-1-keychain-preflight-form")
  } finally {
    await app.close()
  }
})

test("① 渲染预检：setChatReadiness(false) 黄条 + 以后再连仍可用", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 20_000 })
    await openConnectModelStep(window)
    await window.evaluate(() => {
      const current = window.__enjoyE2e?.getChatReadiness()
      window.__enjoyE2e?.setChatReadiness({
        ready: false,
        engineCount: current?.engineCount ?? 0,
        engines: current?.engines ?? [],
        localModels: current?.localModels ?? [],
        apiKeys: current?.apiKeys ?? [],
        secretStorageAvailable: false
      })
    })
    const wizardNotice = window.getByTestId("secret-write-notice")
    await expect(wizardNotice).toBeVisible()
    await expect(wizardNotice).toHaveAttribute("data-kind", "preflight")
    await expect(wizardNotice).toContainText(PREFLIGHT_TITLE)
    await expect(wizardNotice).toContainText(PREFLIGHT_BODY)
    await expect(window.getByTestId("connect-model-later")).toBeEnabled()
    await snap(window, "p0-1-keychain-preflight-wizard")

    await openAddKeyForm(window)
    await window.evaluate(() => {
      const current = window.__enjoyE2e?.getChatReadiness()
      window.__enjoyE2e?.setChatReadiness({
        ready: false,
        engineCount: current?.engineCount ?? 0,
        engines: current?.engines ?? [],
        localModels: current?.localModels ?? [],
        apiKeys: current?.apiKeys ?? [],
        secretStorageAvailable: false
      })
    })
    const form = window.getByRole("dialog", { name: "添加 DeepSeek" })
    await expect(form.getByTestId("secret-write-notice")).toContainText(PREFLIGHT_TITLE)
    const save = form.getByTestId("provider-editor-save")
    await expect(save).toBeDisabled()
    await expect(form.getByTestId("secret-write-save-tip")).toHaveAttribute("title", SAVE_TIP)
    const keyBox = form.getByTestId("provider-simple-fields").locator('input[type="password"]').first()
    await expect(keyBox).toBeEnabled()
    await keyBox.fill("sk-keep-typed-value")
    await expect(keyBox).toHaveValue("sk-keep-typed-value")
    await snap(window, "p0-1-keychain-preflight-form")
  } finally {
    await app.close()
  }
})

test("② 保存失败 KEYCHAIN_UNAVAILABLE 红字，草稿留下", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 20_000 })
    await openConnectModelStep(window)
    await openAddKeyForm(window)
    const form = window.getByRole("dialog", { name: "添加 DeepSeek" })
    const keyBox = form.getByTestId("provider-simple-fields").locator('input[type="password"]').first()
    await keyBox.fill("sk-keep-typed-value")
    await window.evaluate(() => {
      window.__enjoyE2e?.forceSecretWrite("KEYCHAIN_UNAVAILABLE")
    })
    await form.getByTestId("provider-editor-save").click()
    const error = form.getByTestId("secret-write-error")
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute("data-code", "KEYCHAIN_UNAVAILABLE")
    await expect(error).toHaveText(WRITE_FAIL)
    await expect(error).not.toContainText(/重启|libsecret|DBus|keychain encryption/i)
    await expect(form.getByTestId("secret-write-notice")).toHaveCount(0)
    await expect(form.getByTestId("provider-simple-fields")).toBeVisible()
    await expect(keyBox).toHaveValue("sk-keep-typed-value")
    await expect(form.getByTestId("provider-editor-save")).toBeEnabled()
    await snap(window, "p0-1-keychain-write-fail")
  } finally {
    await app.close()
  }
})
