/**
 * 重启后 HMAC 通过的 waiting 审批必须把卡重新发出，不能只剩 Inbox 幽灵行。
 * 回挂卡与普通卡相同：可允许、可拒绝。kill -9 / 检查点没刷上：结清停止。
 */
import { existsSync } from "node:fs"
import { expect, test, type ElectronApplication } from "@playwright/test"
import {
  bootPendingApproval,
  closeForRelaunch,
  crashKill,
  expectApprovalInboxCleared,
  expectDecidableCard,
  expectFinishedRunsSettled,
  expectSettledFinishedTurns,
  firstWindow,
  mainEntry,
  readStub,
  relaunchElectron,
  stubPath,
  wipeWaitingCheckpoints
} from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

test("重启后待审批卡还在，允许后工具跑、Inbox 清空", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await relaunchAndAllow(env)
})

test("kill-9 且检查点已刷上：卡仍可批，允许后写出文件", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await crashKill(env.app)
  await relaunchAndAllow({ ...env, app: undefined })
})

test("kill-9 且检查点已刷上：卡可拒绝，文案与 Inbox/徽标清空", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await crashKill(env.app)
  expect(existsSync(stubPath(env.workspace))).toBe(false)
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    await expectDecidableCard(window)
    await window.locator('[data-testid="approval-deny"]').click({ timeout: 15_000, force: true })
    await expect(window.locator("body")).toContainText("已拒绝，本次未执行", { timeout: 20_000 })
    expect(existsSync(stubPath(env.workspace))).toBe(false)
    await expect(window.locator('[data-testid="attention-strip"]')).toHaveCount(0)
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
})

test("kill-9 且检查点没刷上：结清停止，Inbox 空，重新发送回填", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await crashKill(env.app)
  wipeWaitingCheckpoints(env.userData)
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    const composer = window.locator('[data-testid="composer-input"]')
    await expect(window.locator("body")).toContainText("please write a note", { timeout: 20_000 })
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="thread-notice-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("已停止")
    await expect(window.locator("body")).toContainText("重启后对不上原来的审批，这一轮已结束。")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await window.locator('[data-testid="thread-resend"]').click()
    await expect(composer).toHaveValue("please write a note")
    await expect(window.locator('[data-testid="attention-strip"]')).toHaveCount(0)
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
})

test("允许并完成后连重启两次：写行不再转圈，没有额外失败行", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  const first = await firstWindow(env.app)
  await first.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
  await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
  await expect(first.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
  await closeForRelaunch(env.app)
  expectFinishedRunsSettled(env.userData)
  for (let i = 0; i < 2; i += 1) {
    const app = await relaunchElectron(env.env)
    try {
      const window = await firstWindow(app)
      await expectSettledFinishedTurns(window)
    } finally {
      await closeForRelaunch(app)
    }
    expectFinishedRunsSettled(env.userData)
  }
})

test("拒绝后连重启两次：仍是已拒绝，写行不转圈", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  const first = await firstWindow(env.app)
  await first.locator('[data-testid="approval-deny"]').click({ timeout: 15_000, force: true })
  await expect(first.locator("body")).toContainText("已拒绝，本次未执行", { timeout: 20_000 })
  await closeForRelaunch(env.app)
  expectFinishedRunsSettled(env.userData)
  for (let i = 0; i < 2; i += 1) {
    const app = await relaunchElectron(env.env)
    try {
      const window = await firstWindow(app)
      await expect(window.locator("body")).toContainText("已拒绝，本次未执行", { timeout: 20_000 })
      await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
      await expect(window.locator('[data-testid="chat-conversation"] [class*="animate-spin"]')).toHaveCount(0)
      await expect(window.locator("body")).not.toContainText("已运行 1 个工具 · 运行命令 · 失败")
      expect(existsSync(stubPath(env.workspace))).toBe(false)
    } finally {
      await closeForRelaunch(app)
    }
    expectFinishedRunsSettled(env.userData)
  }
})

test("同一 userData 允许一轮再拒绝一轮，连重启两次都保持收工态", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  const first = await firstWindow(env.app)
  await first.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
  await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
  await expect(first.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
  await expect(first.locator('[data-testid="turn-changed-files"]')).toBeVisible()
  await expect(first.locator('[data-testid="approval-allow"]')).toHaveCount(0)
  await sendComposer(first, first.locator('[data-testid="composer-input"]'), "please write a note")
  await first.locator('[data-testid="approval-deny"]').click({ timeout: 15_000, force: true })
  await expect(first.locator("body")).toContainText("已拒绝，本次未执行", { timeout: 20_000 })
  await closeForRelaunch(env.app)
  expectFinishedRunsSettled(env.userData)
  for (let i = 0; i < 2; i += 1) {
    const app = await relaunchElectron(env.env)
    try {
      const window = await firstWindow(app)
      await expectSettledFinishedTurns(window)
      await expect(window.locator("body")).toContainText("已拒绝，本次未执行")
      await expect(window.locator("body")).toContainText("stub-ok allowed write")
    } finally {
      await closeForRelaunch(app)
    }
    expectFinishedRunsSettled(env.userData)
  }
})

async function relaunchAndAllow(input: {
  workspace: string
  userData: string
  env: NodeJS.ProcessEnv
  app?: ElectronApplication
}): Promise<void> {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  if (input.app) await closeForRelaunch(input.app)
  expect(existsSync(stubPath(input.workspace))).toBe(false)
  const second = await relaunchElectron(input.env)
  try {
    const window = await firstWindow(second)
    await expectDecidableCard(window)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect
      .poll(() => existsSync(stubPath(input.workspace)), { timeout: 20_000 })
      .toBe(true)
    expect(readStub(input.workspace)).toContain("from stub")
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
}
