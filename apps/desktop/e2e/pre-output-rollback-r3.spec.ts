/**
 * leo r3（#136）真机路径：
 * - M1：出字前失败回滚时，发送后又打的字不被覆盖（mergeComposerText 合并后写回）。
 * - M2：第一轮已出字、标题站住后「从这里重来」再发，出字前失败不回滚标题。
 * - M4：发出后立刻切走，后台回滚的正文写回 session_drafts，切回来输入框里有。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/pre-output-rollback-r3")

async function boot(env: Record<string, string>) {
  const app = await relaunchElectron({ ...process.env, ENJOY_E2E_STUB: "1", ENJOY_E2E_LANG: "zh", ...env })
  const window = await firstWindow(app)
  const skip = window.getByRole("button", { name: "跳过设置" })
  await window.waitForTimeout(1_000)
  if ((await skip.count()) > 0) await skip.click()
  await window.getByTestId("composer-input").waitFor({ timeout: 20_000 })
  return { app, window }
}

function dirs() {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-r3-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  return { ENJOY_E2E_WORKSPACE: workspace, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-r3-ud-")) }
}

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})

test("M1：发送后接着打的字，出字前失败回滚时不被覆盖", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_DELAY_MS: "4000" })
  try {
    const composer = window.getByTestId("composer-input")
    await composer.fill("帮我看看构建为什么挂了")
    await composer.press("Enter")
    await expect(composer).toHaveValue("", { timeout: 8_000 })
    await composer.pressSequentially("顺便看下测试")
    await window.screenshot({ path: join(shots, "01-typed-while-waiting.png") })
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 20_000 })
    await expect(composer).toHaveValue(/帮我看看构建为什么挂了/)
    await expect(composer).toHaveValue(/顺便看下测试/)
    await window.screenshot({ path: join(shots, "02-rollback-keeps-typed-text.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("M2：第一轮出字后从这里重来再发，出字前失败不回滚已站住的标题", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_SKIP: "1" })
  try {
    const composer = window.getByTestId("composer-input")
    await composer.fill("整理一下发布清单")
    await composer.press("Enter")
    const active = window.locator('[data-testid="sidebar-session-row"][data-active="true"]')
    // 第一轮正常出字，标题精炼成 stub-title。
    await expect(active).toHaveAttribute("data-session-name", "stub-title", { timeout: 30_000 })
    await window.screenshot({ path: join(shots, "03-first-turn-title.png") })
    const userTurn = window.getByText("整理一下发布清单").first()
    await userTurn.hover()
    await window.getByRole("button", { name: "从这里重来" }).first().click()
    await window.getByRole("button", { name: "只改聊天" }).click()
    await expect(composer).toHaveValue(/整理一下发布清单/, { timeout: 8_000 })
    await composer.press("Enter")
    await expect(window.getByTestId("thread-credential-network-notice")).toBeVisible({ timeout: 20_000 })
    await window.waitForTimeout(2_000)
    await expect(active).toHaveAttribute("data-session-name", "stub-title")
    await window.screenshot({ path: join(shots, "04-title-kept-after-rollback.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("M4：发出后立刻切到别的会话，后台回滚的正文切回来还在", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs(), ENJOY_E2E_SEND: "unreachable", ENJOY_E2E_SEND_DELAY_MS: "4000" })
  try {
    const composer = window.getByTestId("composer-input")
    await composer.fill("后台回滚也别丢这句话")
    await composer.press("Enter")
    const active = window.locator('[data-testid="sidebar-session-row"][data-active="true"]')
    await expect(active).toHaveCount(1, { timeout: 8_000 })
    const sid = await active.getAttribute("data-session-id")
    expect(sid).toBeTruthy()
    await window.getByTestId("sidebar-new-session").click()
    await expect(window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sid}"]`)).toHaveAttribute(
      "data-active",
      "false",
      { timeout: 8_000 }
    )
    // 等后台那轮出字前失败回滚完。
    await window.waitForTimeout(7_000)
    await window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sid}"] button`).first().click()
    await expect(window.getByTestId("composer-input")).toHaveValue(/后台回滚也别丢这句话/, { timeout: 10_000 })
    await window.screenshot({ path: join(shots, "05-background-rollback-draft-back.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
