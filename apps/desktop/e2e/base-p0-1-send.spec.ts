/**
 * BASE-P0-1 发送：密钥向导走完、引擎已有项目、有密钥没模型。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import {
  canLaunchElectron,
  hideOverlays,
  launchEnjoy,
  sendHelloAndExpectReply,
  skipGuideIfOpen,
  snap,
  walkConnectedWizardThenStart
} from "./base-p0-1-launch"

test("S1-2 向导走完后能发 hello 并收到回复", async () => {
  test.setTimeout(180_000)
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
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    await walkConnectedWizardThenStart(window)
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    await sendHelloAndExpectReply(window)
    await snap(window, "s1-2-send-hello")
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
  }
})

test("S1-2 引擎夹具已有项目能发 hello 并收到回复", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-engine-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_WORKSPACES: "2",
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "engine"
  })
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    await sendHelloAndExpectReply(window)
    await snap(window, "s1-2-engine-send-hello")
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
  }
})

test("有密钥没选模型时中性提示还差一步并留下草稿", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p01-need-model-"))
  const { app, window } = await launchEnjoy({
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key"
  })
  try {
    await skipGuideIfOpen(window)
    await hideOverlays(window)
    await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getComposerGate?.().sessionId ?? null), {
        timeout: 12_000
      })
      .toBeTruthy()
    const composer = window.locator('[data-testid="composer-input"]')
    await composer.fill("先选模型也要留下草稿")
    await window.evaluate(() => {
      window.__enjoyE2e?.clearSelectedModel()
    })
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getComposerGate?.().modelId ?? "x"), {
        timeout: 4_000
      })
      .toBe("")
    await composer.press("Enter")
    const notice = window.locator('[data-testid="thread-need-model-notice"][data-kind="needs_model"]')
    await notice.waitFor({ timeout: 8_000 })
    await expect(notice).toContainText("还差一步：选一个模型")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(composer).toHaveValue("先选模型也要留下草稿")
    await expect(window.getByTestId("thread-need-model-notice-action")).toHaveText("去选择")
    await window.keyboard.press("Escape")
    await expect(window.getByTestId("composer-engine-chip")).not.toHaveAttribute("data-state", "open")
    await snap(window, "s1-need-model-notice")
    await window.getByTestId("thread-need-model-notice-action").click()
    await expect(window.getByTestId("composer-engine-chip")).toHaveAttribute("data-state", "open")
    await snap(window, "s1-need-model-picker")
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5_000))])
  }
})
