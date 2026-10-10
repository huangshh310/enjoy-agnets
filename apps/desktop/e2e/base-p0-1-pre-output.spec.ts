/**
 * 出字前回滚：失败无气泡、再发成功只有一条、切走再切回仍空、前台不进 Inbox「失败」、
 * 同会话同 clientRequestId 60s 内不重开。
 */
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import {
  canLaunchElectron,
  hideOverlays,
  launchEnjoy,
  skipGuideIfOpen
} from "./base-p0-1-launch"

function keyEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_WORKSPACE: mkdtempSync(join(tmpdir(), "enjoy-p01-pre-")),
    ENJOY_E2E_SKIP_PROFILE: "1",
    ENJOY_E2E_CHAT_READY: "key",
    ...extra
  }
}

async function openChat(window: Page): Promise<void> {
  await skipGuideIfOpen(window)
  await hideOverlays(window)
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  await window.evaluate(() => {
    window.dispatchEvent(new Event("focus"))
    return window.__enjoyE2e?.focusSession?.()
  })
}

function threadBubbles(window: Page) {
  return window.locator('[data-chat-stage="true"] [data-thread-message]')
}

async function sendDraft(window: Page, text: string): Promise<void> {
  const composer = window.getByTestId("composer-input")
  await composer.fill(text)
  await composer.press("Enter")
}

test("出字前失败：线程没有用户气泡，草稿还在 Composer", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "unreachable" }))
  try {
    await openChat(window)
    await sendDraft(window, "hello rollback")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(window.getByTestId("composer-input")).toHaveValue("hello rollback")
    await expect(threadBubbles(window)).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test("出字前失败后再发成功：线程只有一轮气泡", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(
    keyEnv({ ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_ONCE: "1" })
  )
  try {
    await openChat(window)
    await sendDraft(window, "hello later")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(threadBubbles(window)).toHaveCount(0)
    await window.getByTestId("composer-input").press("Enter")
    await expect(window.getByText("hello later", { exact: true })).toHaveCount(1, {
      timeout: 20_000
    })
    await expect(threadBubbles(window)).toHaveCount(2)
  } finally {
    await app.close()
  }
})

test("出字前失败切走再切回：仍没有用户气泡", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "unreachable" }))
  try {
    await openChat(window)
    const sessionId = await window.evaluate(
      () => window.__enjoyE2e?.getComposerGate?.().sessionId ?? null
    )
    await sendDraft(window, "hello rollback")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(threadBubbles(window)).toHaveCount(0)
    await window.getByTestId("sidebar-new-session").click()
    await expect(window.getByTestId("composer-input")).toHaveValue("")
    await window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sessionId ?? ""}"]`).click()
    await expect(window.getByTestId("composer-input")).toBeVisible()
    await expect(threadBubbles(window)).toHaveCount(0)
    await expect(threadBubbles(window).filter({ hasText: "hello rollback" })).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test("前台出字前失败不进 Inbox 失败列", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv({ ENJOY_E2E_SEND: "rejected" }))
  try {
    await openChat(window)
    await sendDraft(window, "hello inbox")
    await expect(window.getByTestId("thread-credential-invalid-notice")).toBeVisible({
      timeout: 12_000
    })
    await expect(window.locator("[data-attention-kind='error']")).toHaveCount(0)
    await window.evaluate(() => {
      location.hash = "#/inbox"
    })
    await expect(window.getByTestId("page-inbox")).toBeVisible({ timeout: 8_000 })
    await window.getByRole("button", { name: "失败" }).click()
    await expect(window.getByText("hello inbox")).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test("同一 clientRequestId 60s 内不重开第二轮", async () => {
  test.setTimeout(180_000)
  const blocked = canLaunchElectron()
  test.skip(Boolean(blocked), blocked ?? "")
  const { app, window } = await launchEnjoy(keyEnv())
  try {
    await openChat(window)
    await expect
      .poll(async () => window.evaluate(() => window.__enjoyE2e?.getComposerGate?.().sessionId ?? null), {
        timeout: 12_000
      })
      .toBeTruthy()
    const ids = await window.evaluate(async () => {
      const first = await window.__enjoyE2e!.runWithClientRequestId("hello dedupe", "req-e2e-1")
      const second = await window.__enjoyE2e!.runWithClientRequestId("hello dedupe again", "req-e2e-1")
      return {
        first: first.ok ? first.runId : first.code,
        second: second.ok ? second.runId : second.code
      }
    })
    expect(ids.first).toBe(ids.second)
    await expect(threadBubbles(window).filter({ hasText: "hello dedupe" })).toHaveCount(1, {
      timeout: 20_000
    })
    await expect(window.getByText("hello dedupe again")).toHaveCount(0)
  } finally {
    await app.close()
  }
})
