/**
 * 无真实 Key 的窗口流：stub 发聊天、停止、刷新恢复、审批、知识索引、工作流、导入资产。
 */
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { existsSync } from "node:fs"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")

test("stub Agent：发送、停止、恢复、审批、知识、工作流、导入", async () => {
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
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\nhello knowledge\n")
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
    const composer = window.locator('textarea[placeholder*="Ask Enjoy Agents"]')
    await composer.waitFor({ timeout: 20_000 })
    await composer.fill("hello stub")
    await window.locator('button[aria-label="Send"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.locator('[data-testid="composer-attach"]').setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("attached body")
    })
    await window.waitForSelector('[data-testid="composer-asset-chip"]', { timeout: 8_000 })
    await composer.fill("read this")
    await window.locator('button[aria-label="Send"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("attached:note.txt"), undefined, {
      timeout: 20_000
    })

    await composer.fill("please go slow now")
    await window.locator('button[aria-label="Send"]').click()
    await window.waitForSelector('button[aria-label="Stop"]', { timeout: 8_000 })
    await window.locator('button[aria-label="Stop"]').click()
    await window.locator('button[aria-label="Send"]').waitFor({ timeout: 8_000 })

    await composer.fill("please write a note")
    await window.locator('button[aria-label="Send"]').click()
    const allow = window.locator("button").filter({ hasText: /^Allow$/ })
    await allow.waitFor({ timeout: 15_000 })
    await allow.click({ force: true })
    await window.waitForFunction(() => document.body.innerText.includes("allowed write"), undefined, {
      timeout: 15_000
    })

    await window.reload()
    await window.waitForFunction(() => document.body.innerText.includes("stub-ok"), undefined, {
      timeout: 20_000
    })

    await window.getByRole("button", { name: "Extract object" }).first().click({ timeout: 8_000 })
    await window.waitForFunction(() => document.body.innerText.includes("stub-card"), undefined, {
      timeout: 12_000
    })

    await window.evaluate(() => {
      location.hash = "#/observability"
    })
    await window.waitForFunction(() => document.body.innerText.includes("TTFO"), undefined, {
      timeout: 8_000
    })

    await window.evaluate(() => {
      location.hash = "#/knowledge"
    })
    await window.waitForSelector('[data-testid="knowledge-add-index"]', { timeout: 8_000 })
    await window.locator('[data-testid="knowledge-add-index"]').click()
    await window.waitForFunction(
      () => document.body.innerText.includes("chunk") || document.body.innerText.includes("ready"),
      undefined,
      { timeout: 15_000 }
    )

    await window.evaluate(() => {
      location.hash = "#/"
    })
    await composer.waitFor({ timeout: 12_000 })
    await composer.fill("hello knowledge")
    await window.locator('button[aria-label="Send"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("readme.md"), undefined, {
      timeout: 20_000
    })

    await window.evaluate(() => {
      location.hash = "#/workflows"
    })
    await window.waitForSelector('[data-testid="workflow-start"]', { timeout: 8_000 })
    await window.locator('[data-testid="workflow-start"]').click()
    await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 12_000 })

    await window.evaluate(() => {
      location.hash = "#/media"
    })
    await window.waitForFunction(() => document.body.innerText.includes("Import"), undefined, {
      timeout: 8_000
    })
    await window.locator('input[type="file"]').setInputFiles({
      name: "e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("imported")
    })
    await window.waitForFunction(() => document.body.innerText.includes("e2e.txt"), undefined, {
      timeout: 12_000
    })
    await window.locator("li").filter({ hasText: "e2e.txt" }).first().getByText("e2e.txt").click()
    await window.locator("li").filter({ hasText: "e2e.txt" }).first().getByTestId("asset-export").click()
    await window.waitForFunction(
      () => document.body.innerText.includes("Exported") || document.body.innerText.includes("export.bin"),
      undefined,
      { timeout: 12_000 }
    )
    await window.waitForFunction(() => document.body.innerText.includes("Translate"), undefined, {
      timeout: 8_000
    })

    await window.evaluate(() => {
      location.hash = "#/mcp"
    })
    await window.waitForSelector('[data-testid="mcp-add-server"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-add-server"]').click()
    const trust = window.locator("button").filter({ hasText: /^Trust$/ })
    await trust.waitFor({ timeout: 8_000 })
    await trust.click()
    await window.waitForSelector('[data-testid="mcp-open-app"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-open-app"]').click()
    await window.waitForSelector('[data-testid="mcp-app-frame"]', { timeout: 8_000 })
    const appFrame = window.frameLocator('[data-testid="mcp-app-frame"]')
    await appFrame.locator('[data-testid="mcp-app-ready"]').waitFor({ timeout: 8_000 })
    await appFrame.locator('[data-testid="mcp-app-log"]').click()
    await window.waitForSelector('[data-testid="mcp-app-log-text"]', { timeout: 8_000 })
    await expect(window.locator('[data-testid="mcp-app-log-text"]')).toHaveText("app-log-ok")
  } finally {
    await app.close()
  }
})
