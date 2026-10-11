/**
 * 删档案 KEYCHAIN_UNAVAILABLE：确认框内提示，框不关。
 * 先种盘再挂钥匙串（启动时 unavailable 会挡住 upsert）。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import { canLaunchElectron, hideOverlays, launchEnjoy, skipGuideIfOpen, snap } from "./base-p0-1-launch"

const UNAVAILABLE =
  "没删掉：系统钥匙串现在用不了，这把密钥暂时删不了，其他密钥不受影响。请确认钥匙串已解锁后再试。"
const PRESET_HINT = "如果担心这把密钥泄露，可以先到 OpenAI 后台作废它。"
const CUSTOM_HINT = "如果担心这把密钥泄露，可以先到服务商后台作废它。"

test("钥匙串挂了删档案：精选有去作废，自定义无链接，框不关", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-del-kc-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-del-kc-ud-"))

  const seeded = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_CHAT_READY: "key"
  })
  try {
    await skipGuideIfOpen(seeded.window)
    await hideOverlays(seeded.window)
    const upserted = await seeded.window.evaluate(async () => {
      const ide = window.ide
      if (!ide?.settings?.upsertProvider) return false
      const result = await ide.settings.upsertProvider({
        id: "e2e-custom",
        name: "E2E Custom",
        kind: "custom",
        apiStyle: "openai",
        baseURL: "https://example.com/v1",
        apiKey: "sk-custom-e2e",
        activate: false
      })
      return Boolean(result && typeof result === "object" && "ok" in result ? result.ok !== false : true)
    })
    test.skip(!upserted, "custom profile seed failed")
  } finally {
    await seeded.app.close()
  }

  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_KEYCHAIN: "unavailable"
  })
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    await window.evaluate(() => {
      location.hash = "#/settings/providers"
    })
    const preset = window.getByTestId("provider-row-e2e")
    const custom = window.getByTestId("provider-row-e2e-custom")
    await expect(preset).toBeVisible({ timeout: 15_000 })
    await expect(custom).toBeVisible()
    await expect(window.getByTestId("provider-row-key-e2e")).toHaveText("密钥已保存")

    await refuseDelete(window, "e2e")
    const notice = window.getByTestId("delete-keychain-unavailable")
    await expect(notice).toHaveText(UNAVAILABLE)
    await expect(notice).not.toContainText("KEYCHAIN")
    await expect(window.getByTestId("delete-revoke-hint")).toContainText(PRESET_HINT)
    const link = window.getByTestId("delete-revoke-link")
    await expect(link).toBeVisible()
    await expect(link).toHaveText("去作废")
    await expect(window.getByTestId("confirm-dialog-confirm")).toBeEnabled()
    await expect(preset).toBeVisible()
    await expect(window.getByTestId("provider-row-key-e2e")).toHaveText("密钥已保存")
    await expect(window.locator("[data-sonner-toast]")).toHaveCount(0)
    await snap(window, "delete-keychain-unavailable-preset")

    await window.getByRole("button", { name: "取消" }).click()
    await expect(window.getByTestId("provider-remove-dialog")).toHaveCount(0)

    await refuseDelete(window, "e2e-custom")
    await expect(window.getByTestId("delete-keychain-unavailable")).toHaveText(UNAVAILABLE)
    await expect(window.getByTestId("delete-revoke-hint")).toHaveText(CUSTOM_HINT)
    await expect(window.getByTestId("delete-revoke-link")).toHaveCount(0)
    await expect(window.getByTestId("confirm-dialog-confirm")).toBeEnabled()
    await expect(custom).toBeVisible()
    await snap(window, "delete-keychain-unavailable-custom")
  } finally {
    await app.close()
  }
})

async function refuseDelete(window: Page, id: string): Promise<void> {
  await window.getByTestId(`provider-row-more-${id}`).click()
  await window.getByTestId(`provider-row-delete-${id}`).click()
  await expect(window.getByTestId("provider-remove-dialog")).toBeVisible()
  await window.getByTestId("confirm-dialog-confirm").click()
  await expect(window.getByTestId("delete-keychain-unavailable")).toBeVisible({ timeout: 8_000 })
}
