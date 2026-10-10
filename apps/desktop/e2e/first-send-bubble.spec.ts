/**
 * stub 夹具：新建对话首次发送后主区必须出现用户气泡，不能停在欢迎页。
 * 旧路径只在种子空会话 fill+send，绿了也覆盖不到「新对话」+ 上轮已决 SDK id。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("新建对话首次发送后主区出现气泡，且跨会话仍弹审批卡", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
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
      ENJOY_E2E_USERDATA: userData
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
    await sendComposer(window, composer, "desktop catchup notes")
    const deny = window.locator('[data-testid="approval-deny"]')
    await deny.waitFor({ timeout: 20_000 })
    await deny.click()

    await window.locator('[data-testid="sidebar-new-session"]').click()
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage).toContainText(/在 .* 里做什么|What should we do/, { timeout: 15_000 })

    await sendComposer(window, composer, "hello from new chat")
    await expect(stage.locator("[data-thread-message]").first()).toBeVisible({ timeout: 20_000 })
    await expect(stage).toContainText("hello from new chat")
    await expect(stage).not.toContainText(/What should we do in|在 .* 里做什么/)

    await window.locator('[data-testid="sidebar-new-session"]').click()
    await expect(stage).toContainText(/在 .* 里做什么|What should we do/, { timeout: 15_000 })
    await sendComposer(window, composer, "desktop catchup notes")
    await expect(stage).toContainText("desktop catchup notes", { timeout: 20_000 })
    await expect(stage).not.toContainText(/What should we do in|在 .* 里做什么/)
    await expect(window.locator('[data-testid="approval-deny"]')).toBeVisible({ timeout: 20_000 })
  } finally {
    await app.close()
  }
})

test("新对话创建窗内立刻发送：气泡仍要出现，不能吞掉输入", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
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
      ENJOY_DEV_DELAY_SESSION_CREATE_MS: "2000"
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
    await window.locator('[data-testid="sidebar-new-session"]').click()
    await sendComposer(window, composer, "hello during create")
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage.locator("[data-thread-message]").first()).toBeVisible({ timeout: 20_000 })
    await expect(stage).toContainText("hello during create")
    await expect(stage).not.toContainText(/What should we do in|在 .* 里做什么/)
  } finally {
    await app.close()
  }
})
