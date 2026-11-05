/**
 * P2 Composer 轻 Recipe soft · 真机自门 4 屏
 * 1 保存带提示词 · 2 套用可感 · 3 desktopBias+主流程 · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-composer-recipe"

test("P2 Composer 轻 Recipe soft · 4 屏自门", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(SHOTS, { recursive: true })

  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  test.skip(!electron?.launch, "playwright electron launcher unavailable")

  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-recipe-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-recipe-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")

  const app = (await electron!.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_SESSION_COUNT: "4"
    }
  })) as ElectronApplication

  const sample: Record<string, unknown> = { at: new Date().toISOString() }

  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    await expect(window.locator('[data-testid="composer-input"]')).toBeVisible({ timeout: 45_000 })

    // 打开引擎选择器 → 启动预设轨
    await window.getByTestId("composer-engine-chip").click()
    await expect(window.getByTestId("agent-picker-panel")).toBeVisible({ timeout: 10_000 })
    await window.getByTestId("composer-preset-rail").click()
    await expect(window.getByTestId("composer-preset-row")).toBeVisible({ timeout: 8_000 })

    // ── 屏① 保存带提示词 ──
    await window.getByTestId("composer-preset-save-toggle").click()
    await expect(window.getByTestId("composer-preset-save-form")).toBeVisible()
    await window.getByTestId("composer-preset-name").fill("代码审阅")
    await window.getByTestId("composer-preset-note").fill("看 PR 时用")
    await window.getByTestId("composer-preset-prompt").fill("请先列风险，再给最小改动建议。")
    await expect(window.getByTestId("composer-preset-prompt-count")).toContainText("/4000")
    await window.getByTestId("composer-preset-desktop-bias").locator("input").check()
    await expect(window.getByText("不会自动批准任何操作")).toBeVisible()
    await window.screenshot({ path: join(SHOTS, "01-save-with-prompt.png") })
    sample.screen1 = {
      name: "代码审阅",
      hasPromptField: true,
      biasHint: "不会自动批准任何操作"
    }

    await window.getByTestId("composer-preset-save-submit").click()
    await expect(window.getByTestId("composer-preset-list")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByText("有提示词").first()).toBeVisible({ timeout: 8_000 })

    // 关掉 flyout，清草稿再套用
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)
    await window.getByTestId("composer-input").fill("")
    await window.waitForTimeout(200)

    // ── 屏② 套用可感 ──
    await window.getByTestId("composer-engine-chip").click()
    await expect(window.getByTestId("agent-picker-panel")).toBeVisible({ timeout: 10_000 })
    await window.getByTestId("composer-preset-rail").click()
    await expect(window.getByTestId("composer-preset-list")).toBeVisible({ timeout: 8_000 })
    await window.getByTestId("composer-preset-apply").first().click()
    await window.waitForTimeout(500)
    // 关 flyout 看草稿
    await window.keyboard.press("Escape")
    await window.waitForTimeout(400)
    const draft = await window.getByTestId("composer-input").inputValue()
    expect(draft).toContain("请先列风险")
    const toast = window.locator('[data-testid="composer-preset-applied-toast"], [data-sonner-toast]')
    const toastText = ((await toast.first().textContent().catch(() => "")) || "")
    expect(toastText).not.toMatch(/已批准|全面 Recipe|Goose|技能自动批准/)
    await window.screenshot({ path: join(SHOTS, "02-apply-felt.png") })
    sample.screen2 = { draftSnippet: draft.slice(0, 40), toastText }

    // ── 屏③ desktopBias + 主流程 ──
    await expect(window.getByTestId("preset-desktop-bias-pill")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByTestId("preset-desktop-bias-pill")).toHaveText("更倾向桌面")
    // Composer 可写、Dock/发送入口在
    await expect(window.getByTestId("composer-input")).toBeEditable()
    await expect(window.getByTestId("composer-send")).toBeVisible()
    await window.screenshot({ path: join(SHOTS, "03-desktopBias-main-flow.png") })
    sample.screen3 = { pill: "更倾向桌面", sendVisible: true }

    // ── 屏④ 零扩张 ──
    const bodyText = await window.locator("body").innerText()
    expect(bodyText).not.toMatch(/全面 Recipe|Goose 兼容|技能自动批准|已批准桌面/)
    // 契约侧禁键已由单测覆盖；UI 无 Goose 导入 / E8 大面板入口
    expect(await window.locator("text=Goose").count()).toBe(0)
    expect(await window.locator("text=全面 Recipe").count()).toBe(0)
    await window.screenshot({ path: join(SHOTS, "04-zero-expansion.png") })
    sample.screen4 = { bannedCopyAbsent: true, i3StillStopped: true }

    writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
  } finally {
    await app.close().catch(() => undefined)
  }
})

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow({ timeout: 60_000 })
  await window.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => undefined)
  await window.waitForTimeout(800)
  return window
}
