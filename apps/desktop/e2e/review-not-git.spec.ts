/**
 * 非 git 工作区：允许写盘后打开审查栏，必须看到「没有用 Git 管理」+ 本轮文件，不能白屏。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("非 git 允许写盘后开审查：空态 + 本轮 e2e-stub.txt", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-nongit-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-nongit-"))
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
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
      timeout: 15_000
    })

    const barOpen = window.locator('[data-testid="session-review-open"]').first()
    if (await barOpen.isVisible().catch(() => false)) {
      await barOpen.click()
    } else {
      await window.locator('[data-testid="pane-pick-review"]').click({ timeout: 8_000 })
    }

    const empty = window.locator('[data-testid="review-not-git-empty"]')
    await empty.waitFor({ timeout: 12_000 })
    await expect(empty).toContainText("没有用 Git 管理")
    await expect(empty).toContainText("e2e-stub.txt")
    await expect(window.locator("body")).not.toContainText("Maximum update depth exceeded")
  } finally {
    await app.close()
  }
})
