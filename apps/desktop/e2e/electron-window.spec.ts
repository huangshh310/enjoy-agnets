/**
 * Electron 窗口冒烟：有 desktop build 且 playwright 带 _electron 才启动。
 * 不连真实 Provider；验主界面与计划里的 Hash 路由能打开。
 */
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

const mainEntry = join(process.cwd(), "out/main/index.js")

const ROUTES = [
  { hash: "#/knowledge", testid: "page-knowledge" },
  { hash: "#/workflows", testid: "page-workflows" },
  { hash: "#/media", testid: "page-media" },
  { hash: "#/mcp", testid: "page-mcp" },
  { hash: "#/observability", testid: "page-observability" }
] as const

test("Electron 窗口能打开主界面并进入 Knowledge / Workflows / Media / MCP", async () => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const playwright = await import("playwright")
  const electron = playwright._electron
  if (!electron?.launch) {
    test.skip(true, "playwright electron launcher unavailable")
    return
  }
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-win-"))
  const app = await electron.launch({
    args: [mainEntry],
    cwd: process.cwd(),
    timeout: 45_000,
    env: { ...process.env, ENJOY_E2E_LANG: "en", ENJOY_E2E_USERDATA: userData }
  })
  try {
    const window = await app.firstWindow()
    await window.waitForSelector("#root", { timeout: 20_000 })
    await window.waitForFunction(() => (document.querySelector("#root")?.childElementCount ?? 0) > 0, undefined, {
      timeout: 20_000
    })
    const body = await window.locator("body").innerText()
    expect(body.length).toBeGreaterThan(0)
    for (const route of ROUTES) {
      await window.evaluate((hash) => {
        location.hash = hash
      }, route.hash)
      await window.waitForSelector(`[data-testid="${route.testid}"]`, { timeout: 12_000 })
    }
    await window.evaluate(() => {
      location.hash = "#/mcp"
    })
    await window.waitForSelector('[data-testid="mcp-add-server"]', { timeout: 8_000 })
    await window.locator('[data-testid="mcp-add-server"]').click()
    await window.waitForSelector('[data-testid="mcp-save-server"]', { timeout: 8_000 })
    await window.evaluate(() => {
      location.hash = "#/knowledge"
    })
    await window.waitForSelector('[data-testid="knowledge-add-index"]', { timeout: 8_000 })
    await window.locator('[data-testid="knowledge-rerank"]').click()
    await window.waitForFunction(() => document.body.innerText.includes("Rerank: ON"), undefined, {
      timeout: 8_000
    })
    await window.evaluate(() => {
      location.hash = "#/workflows"
    })
    await window.waitForSelector('[data-testid="workflow-start"]', { timeout: 8_000 })
  } finally {
    await app.close()
  }
})
