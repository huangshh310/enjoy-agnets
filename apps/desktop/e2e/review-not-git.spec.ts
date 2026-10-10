/**
 * 非 git 工作区：菜单「审查」和 Ctrl+Shift+G 都不得白屏。
 * 空态主句 / 副句固定，不要「初始化 Git」。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

async function launchStub(workspace: string) {
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) return null
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-nongit-"))
  return electron.launch({
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
}

async function assertNotGitEmpty(window: import("@playwright/test").Page, file?: string) {
  const empty = window.locator('[data-testid="review-not-git-empty"]')
  await empty.waitFor({ timeout: 12_000 })
  await expect(empty).toContainText("这个文件夹没有用 Git 管理")
  await expect(empty).toContainText("本轮改过的文件仍会列在下面。")
  if (file) await expect(empty).toContainText(file)
  await expect(window.locator("body")).not.toContainText("初始化 Git")
  await expect(window.locator("body")).not.toContainText("Maximum update depth exceeded")
}

test("非 git 空会话：Ctrl+Shift+G 与审查入口都不炸", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-nongit-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await launchStub(workspace)
  if (!app) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })

    await window.keyboard.press("Control+Shift+G")
    await assertNotGitEmpty(window)

    const picker = window.locator('[data-testid="pane-pick-review"]')
    if (await picker.isVisible().catch(() => false)) {
      await picker.click()
      await assertNotGitEmpty(window)
    }

    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
      timeout: 15_000
    })

    const barOpen = window.locator('[data-testid="session-review-open"]').first()
    if (await barOpen.isVisible().catch(() => false)) {
      await barOpen.click()
    } else {
      await window.keyboard.press("Control+Shift+G")
    }
    await assertNotGitEmpty(window, "e2e-stub.txt")
  } finally {
    await app.close()
  }
})
