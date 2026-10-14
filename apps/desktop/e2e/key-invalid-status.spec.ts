/**
 * 密钥三态：引导第 4 步、第 7 步、设置页供应商行。
 * 红只给 invalid（被拒）；unverified:network 中性灰；ok 绿。
 * 需要先 build。截图：设 ENJOY_E2E_SHOTS_DIR 时落盘，不设不截。
 */
import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import {
  canLaunchElectron,
  clickGuidePrimary,
  launchEnjoy,
  openAddKeyForm,
  openConnectModelStep,
  skipGuideIfOpen
} from "./base-p0-1-launch"

const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR

async function shot(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  // 等弹窗淡入淡出走完，截图不留半透明残影。
  await window.waitForTimeout(400)
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}

async function walkToReady(window: Page): Promise<void> {
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
  await window.getByRole("heading", { name: "打开第一个项目" }).waitFor({ timeout: 8_000 })
  await clickGuidePrimary(window)
}

/** 真实路径：none 起步，引导里存一把 DeepSeek 密钥，回到第 4 步。 */
async function saveKeyFromGuide(window: Page, key: string): Promise<void> {
  await openConnectModelStep(window)
  await openAddKeyForm(window)
  const form = window.getByRole("dialog", { name: "添加 DeepSeek" })
  await form.getByTestId("provider-simple-fields").locator('input[type="password"]').first().fill(key)
  await form.getByTestId("provider-editor-save").click()
}

async function openProviderSettings(window: Page): Promise<void> {
  await window.evaluate(() => {
    window.__enjoyE2e?.hideCreateProject()
    location.hash = "#/settings/providers"
  })
  await window.getByTestId("provider-key-status").first().waitFor({ timeout: 12_000 })
  // 首启闸可能把向导从介绍页再打开：点「跳过设置」收掉，截图只留设置页。
  const skip = window.getByRole("button", { name: "跳过设置" })
  await skip.waitFor({ timeout: 3_000 }).catch(() => undefined)
  await skipGuideIfOpen(window)
  await expect(skip).toHaveCount(0, { timeout: 8_000 })
}

test("invalid：存密钥后第 4 步红、第 7 步说被拒并直达改密钥、设置页红", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none",
    ENJOY_E2E_CREDENTIAL: "invalid"
  })
  try {
    await saveKeyFromGuide(window, "sk-e2e-bad")

    // 存完回第 4 步，直接看到校验结果
    const row = window.getByTestId("connect-model-api_key")
    await expect(row).toHaveAttribute("data-key-status", "invalid", { timeout: 15_000 })
    await expect(row).toContainText("密钥被 DeepSeek 拒绝了，换一个再试")
    await expect(row).toContainText("改密钥")
    await expect(row).not.toContainText("已连上")
    await shot(window, "k1-step4-invalid")

    await walkToReady(window)
    await window.getByRole("heading", { name: "密钥被 DeepSeek 拒绝了" }).waitFor({ timeout: 8_000 })
    await expect(window.getByTestId("ready-key-invalid-summary")).toContainText("换一个 DeepSeek 密钥再试")
    await expect(window.getByRole("heading", { name: "还差一步：连一个模型" })).toHaveCount(0)
    await expect(window.getByTestId("setup-guide-primary")).toHaveText("改密钥")
    await shot(window, "k2-step7-invalid")

    // 不绕圈：主钮直接打开那份档案的编辑器
    await clickGuidePrimary(window)
    await window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, { timeout: 8_000 })
    await expect(window.getByTestId("provider-editor-save")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByTestId("provider-pick-panel")).toHaveCount(0)
    await expect(window.getByRole("heading", { name: "密钥被 DeepSeek 拒绝了" })).toHaveCount(0, { timeout: 8_000 })
    await shot(window, "k3-fix-key-editor")
    // 取消：回引导第 4 步，仍是红的
    await window.getByRole("button", { name: "取消" }).click()
    await expect(window.getByTestId("connect-model-api_key")).toHaveAttribute("data-key-status", "invalid", {
      timeout: 8_000
    })

    await openProviderSettings(window)
    const status = window.getByTestId("provider-key-status").first()
    await expect(status).toHaveAttribute("data-key-status", "invalid")
    await expect(status).toContainText("密钥被 DeepSeek 拒绝了，换一个再试")
    await expect(window.getByTestId("provider-fix-key").first()).toBeVisible()
    await expect(window.getByText("密钥已保存", { exact: true })).toHaveCount(0)
    await shot(window, "k4-settings-invalid")
  } finally {
    await app.close()
  }
})

for (const fixture of [
  { flag: "ok", status: "ok", step4: "已连上", settings: "密钥已验证", shot: "k5" },
  {
    flag: "unverified:network",
    status: "unverified",
    step4: "密钥已保存，暂时没法确认能否用",
    settings: "密钥已保存，暂时没法确认能否用",
    shot: "k6"
  }
] as const) {
  test(`${fixture.flag}：第 4 步与设置页按三态显示`, async () => {
    test.setTimeout(180_000)
    const blocked = canLaunchElectron()
    test.skip(Boolean(blocked), blocked ?? "")
    const { app, window } = await launchEnjoy({
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "none",
      ENJOY_E2E_CREDENTIAL: fixture.flag
    })
    try {
      await saveKeyFromGuide(window, `sk-e2e-${fixture.status}`)
      const row = window.getByTestId("connect-model-api_key")
      await expect(row).toHaveAttribute("data-key-status", fixture.status, { timeout: 15_000 })
      await expect(row).toContainText(fixture.step4)
      await expect(row).not.toContainText("拒绝了")
      await shot(window, `${fixture.shot}-step4-${fixture.status}`)

      await walkToReady(window)
      await expect(window.getByTestId("setup-guide-primary")).toHaveText("开始使用", { timeout: 8_000 })
      await shot(window, `${fixture.shot}-step7-${fixture.status}`)
      await clickGuidePrimary(window)
      await expect(window.getByTestId("setup-guide-primary")).toHaveCount(0, { timeout: 8_000 })

      await openProviderSettings(window)
      const status = window.getByTestId("provider-key-status").first()
      await expect(status).toHaveAttribute("data-key-status", fixture.status)
      await expect(status).toContainText(fixture.settings)
      await expect(window.getByTestId("provider-fix-key")).toHaveCount(0)
      await shot(window, `${fixture.shot}-settings-${fixture.status}`)
    } finally {
      await app.close()
    }
  })
}
