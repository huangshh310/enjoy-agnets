/**
 * BASE-P0-1 运行时截图：S1-1…S1-7。需要先 `pnpm --filter @enjoy-agents/desktop build`。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import {
  canLaunchElectron,
  clickGuidePrimary,
  launchEnjoy,
  openConnectModelStep,
  snap
} from "./base-p0-1-launch"

test("S1-1/3/4/5 向导连模型、还差一步、空态、重开", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await openConnectModelStep(window)
    await expect(window.getByTestId("connect-model-api_key")).toBeVisible()
    await expect(window.getByTestId("connect-model-later")).toBeVisible()
    await expect(window.getByTestId("connect-model-engine")).toHaveCount(0)
    await expect(window.getByTestId("connect-model-local_model")).toHaveCount(0)
    await expect(window.getByRole("heading", { name: "连一个模型" })).toBeVisible()
    await snap(window, "s1-1-connect-model-fresh")

    await window.getByTestId("connect-model-later").click()
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
    await expect(window.getByTestId("appearance-preview-light")).toBeVisible()
    await expect(window.getByTestId("appearance-preview-dark")).toBeVisible()
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "打开第一个工作区" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "还差一步：连一个模型" }).waitFor({ timeout: 8_000 })
    await expect(window.getByTestId("ready-need-summary")).toContainText("已装 1 个引擎")
    await expect(window.getByTestId("setup-guide-primary")).toHaveText("去连接")
    await expect(window.getByRole("button", { name: "先逛逛" })).toBeVisible()
    await expect(window.getByRole("heading", { name: "可以开始了" })).toHaveCount(0)
    await snap(window, "s1-3-ready-need")

    await window.getByRole("button", { name: "先逛逛" }).click()
    await window.getByTestId("no-project-empty").waitFor({ timeout: 8_000 })
    await expect(window.getByTestId("no-project-empty")).toContainText("选一个文件夹开始")
    await expect(window.getByRole("button", { name: "选择文件夹" })).toBeVisible()
    await expect(window.getByText("打开工作区", { exact: true })).toHaveCount(0)
    await snap(window, "s1-5-no-project-empty")

    await window.getByTestId("sidebar-new-session").click()
    await expect(window.getByTestId("no-project-empty")).toBeVisible()
    await expect(window.getByTestId("no-project-new-chat-hint")).toContainText("先选一个文件夹")
    await snap(window, "s1-5-new-chat-stays-empty")

    await window.getByTestId("create-project-trigger").click()
    await window.getByTestId("create-project-dialog").waitFor({ timeout: 8_000 })
    await expect(window.getByTestId("create-project-dialog")).toBeVisible()
    await snap(window, "s1-create-project-first-click")
    await window.evaluate(() => {
      window.__enjoyE2e?.hideCreateProject()
    })
    await expect(window.getByTestId("create-project-dialog")).toHaveCount(0)

    await window.evaluate(() => {
      location.hash = "#/settings/general"
    })
    await window.getByTestId("setup-guide-replay").waitFor({ timeout: 12_000 })
    await expect(window.getByTestId("setup-guide-replay")).toHaveText("重新打开入门向导")
    await window.getByTestId("setup-guide-replay").scrollIntoViewIfNeeded()
    await snap(window, "s1-4-settings-replay")
    const search = window.locator('input[type="search"]').first()
    await search.fill("向导")
    await expect(window.locator('[data-testid="module-nav-scroll"]')).toContainText("通用")
    await search.fill("入门")
    await expect(window.locator('[data-testid="module-nav-scroll"]')).toContainText("通用")
    await search.fill("引导")
    await expect(window.locator('[data-testid="module-nav-scroll"]')).toContainText("通用")
    await snap(window, "s1-4-settings-search")

    await window.getByTestId("setup-guide-replay").click()
    await window.getByRole("heading", { name: "欢迎使用 Enjoy Agents" }).waitFor({ timeout: 8_000 })
    await snap(window, "s1-4-replay-opens")
  } finally {
    await app.close()
  }
})

test("S1-2 添加表单、已连上、末屏可以开始了", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const form = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await openConnectModelStep(form.window)
    await form.window.getByTestId("connect-model-api_key").click()
    await clickGuidePrimary(form.window)
    await form.window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, {
      timeout: 8_000
    })
    await form.window.evaluate(() => {
      window.__enjoyE2e?.hideGuide()
    })
    await expect(form.window.getByTestId("setup-guide-connect-model")).toHaveCount(0)
    await expect(form.window.getByTestId("provider-pick-panel")).toBeVisible()
    await expect(form.window.getByText("选一家，粘贴密钥")).toBeVisible()
    await snap(form.window, "s1-2-add-key-form")
  } finally {
    await form.app.close()
  }

  const keyed = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "key"
  })
  try {
    await openConnectModelStep(keyed.window)
    await expect(keyed.window.getByTestId("connect-model-api_key")).toContainText("已连上")
    await snap(keyed.window, "s1-2-connect-model-connected")

    await clickGuidePrimary(keyed.window)
    await keyed.window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(keyed.window)
    await keyed.window.getByRole("heading", { name: "打开第一个工作区" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(keyed.window)
    await keyed.window.getByRole("heading", { name: "可以开始了" }).waitFor({ timeout: 8_000 })
    await expect(keyed.window.getByTestId("setup-guide-primary")).toHaveText("开始使用")
    await expect(keyed.window.getByRole("heading", { name: "还差一步：连一个模型" })).toHaveCount(0)
    await snap(keyed.window, "s1-2-ready-ok")
  } finally {
    await keyed.app.close()
  }
})

test("未验证本机模型露出提示，末屏仍还差一步", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "unverified"
  })
  try {
    await openConnectModelStep(window)
    const local = window.getByTestId("connect-model-local_model")
    await expect(local).toBeVisible()
    await expect(local).toHaveAttribute("data-verified", "false")
    await expect(local).toContainText("未验证")
    await expect(local).toContainText("远端地址")
    await expect(window.getByTestId("connect-model-verify")).toHaveText("去验证")
    await expect(local).not.toHaveAttribute("data-recommended", "true")
    await snap(window, "s1-unverified-local-model")

    await window.getByTestId("connect-model-later").click()
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "打开第一个工作区" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "还差一步：连一个模型" }).waitFor({ timeout: 8_000 })
    await expect(window.getByRole("heading", { name: "可以开始了" })).toHaveCount(0)
    await snap(window, "s1-unverified-ready-need")
  } finally {
    await app.close()
  }
})

test("S1-6/7 无路线中性横幅、已有项目、密钥无效红卡", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-ws-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "none"
  })
  try {
    await skipGuideIfOpen(window)
    await window.evaluate(() => {
      window.__enjoyE2e?.hideGuide()
      window.__enjoyE2e?.hideCreateProject()
    })
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    await expect(window.getByTestId("no-project-empty")).toHaveCount(0)
    await expect(window.getByText("打开工作区", { exact: true })).toHaveCount(0)
    await snap(window, "s1-7-project-present-light")
    await window.evaluate(() => {
      document.documentElement.classList.add("dark")
      document.documentElement.dataset.theme = "dark"
    })
    await snap(window, "s1-7-project-present-dark")
    await window.evaluate(() => {
      document.documentElement.classList.remove("dark")
      document.documentElement.dataset.theme = "light"
    })

    const composer = window.locator('[data-testid="composer-input"]')
    await composer.fill("还差一步也要留下草稿")
    await composer.press("Enter")
    await window.locator('[data-testid="thread-no-chat-route-notice"][data-kind="no_chat_route"]').waitFor({
      timeout: 8_000
    })
    await expect(window.locator('[data-testid="thread-no-chat-route-notice"]')).toContainText("草稿会留着")
    await expect(window.locator('[data-testid="composer-input"]')).toHaveValue("还差一步也要留下草稿")
    await expect(window.getByTestId("no-chat-route-connect")).toHaveText("去连接")
    await snap(window, "s1-6-no-chat-route")

    await window.getByTestId("no-chat-route-connect").click()
    await window.waitForFunction(() => location.hash.includes("settings/providers"), undefined, { timeout: 8_000 })
    await expect(window.getByTestId("provider-pick-panel")).toBeVisible()
    await snap(window, "s1-6-go-connect-form")

    await window.evaluate(() => {
      location.hash = "#/"
    })
    await window.getByTestId("composer-input").waitFor({ timeout: 8_000 })
    await window.evaluate(() => {
      window.__enjoyE2e?.setError("Incorrect API key provided")
    })
    await expect(window.getByText("Incorrect API key provided")).toBeVisible()
    await snap(window, "s1-6-invalid-key-red")
  } finally {
    await app.close()
  }
})

test("S1-2 向导有密钥后能发 hello 并收到回复", async () => {
  test.setTimeout(180_000)
  test.skip(
    true,
    "等 #130 落地 defaultRoute 与 CHAT_READY=key 可发 stub；当前 main 夹具只假 ready，发送仍会 no_chat_route"
  )
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-hello-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key"
  })
  try {
    await openConnectModelStep(window)
    await expect(window.getByTestId("connect-model-api_key")).toContainText("已连上")
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "选一个外观" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "打开第一个工作区" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByRole("heading", { name: "可以开始了" }).waitFor({ timeout: 8_000 })
    await clickGuidePrimary(window)
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.fill("hello")
    await composer.press("Enter")
    await expect(window.getByText("hello", { exact: true })).toBeVisible({ timeout: 12_000 })
    await expect(window.locator('[data-testid="thread-no-chat-route-notice"]')).toHaveCount(0)
    await expect(window.locator("[data-thread-message]").filter({ hasText: /.+/ })).toHaveCount(2, {
      timeout: 20_000
    })
    await snap(window, "s1-2-send-hello")
  } finally {
    await app.close()
  }
})

async function skipGuideIfOpen(window: Page): Promise<void> {
  const skip = window.getByRole("button", { name: "跳过设置" })
  if ((await skip.count()) > 0) await skip.click()
}
