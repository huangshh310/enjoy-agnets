/**
 * stub 夹具：空会话发送后主区必须出现用户气泡，不能停在欢迎页。
 */
import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("stub 发送后主区出现气泡", async () => {
  test.setTimeout(60_000)
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
    await sendComposer(window, composer, "hello stub")
    const stage = window.locator('[data-chat-stage="true"]')
    await expect(stage.locator("[data-thread-message]").first()).toBeVisible({ timeout: 20_000 })
    await expect(stage).toContainText("hello stub")
    await expect(stage).not.toContainText("What should we do in")
  } finally {
    await app.close()
  }
})
