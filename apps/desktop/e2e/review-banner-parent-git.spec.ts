/**
 * 工作区是父 git 仓的子目录、文件在未跟踪目录：横幅必须点名 e2e-stub.txt。
 */
import { execSync } from "node:child_process"
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { sendComposer } from "./send-composer"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("父仓子目录 + 未跟踪文件：横幅列出 e2e-stub.txt", async () => {
  test.setTimeout(90_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const parent = mkdtempSync(join(tmpdir(), "enjoy-e2e-parent-git-"))
  execSync("git init", { cwd: parent })
  const workspace = join(parent, "app")
  mkdirSync(workspace)
  writeFileSync(join(workspace, "readme.md"), "# nested workspace\n")
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-ud-parent-"))
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
    await expect(window.locator("body")).toContainText("1 个文件已改 · e2e-stub.txt")
    await expect(window.locator("body")).not.toContainText("可能改了文件，请到「审查」里核对")
  } finally {
    await app.close()
  }
})
