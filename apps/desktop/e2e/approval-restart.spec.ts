/**
 * 重启后 HMAC 通过的 waiting 审批必须把卡重新发出，不能只剩 Inbox 幽灵行。
 */
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("重启后待审批卡还在，Inbox 不再是幽灵行", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-apr-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const env = {
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData
  }

  const launchArgs = [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  const first = await electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env
  })
  try {
    const window = await first.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.waitFor({ timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 15_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible()
  } finally {
    await first.close()
  }

  const second = await electron.launch({
    args: launchArgs,
    cwd: process.cwd(),
    timeout: 45_000,
    env
  })
  try {
    const window = await second.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="approval-allow"]')).toBeVisible()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator("body")).not.toContainText("重启后对不上原来的审批")
  } finally {
    await second.close()
  }
})
