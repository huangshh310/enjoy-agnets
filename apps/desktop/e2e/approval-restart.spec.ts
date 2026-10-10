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
  deleteApprovalHmacKey,
  expectApprovalInboxCleared,
  expectDecidableCard,
  expectFinishedRunsSettled,
  expectSettledFinishedTurns,
  expectComposerFocusedAtEnd,
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

test("SLOW_TOOL 允许后立刻 kill-9：不重跑，中性中断 + 横幅，不算已改", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ slowTool: true })
  try {
    const first = await firstWindow(env.app)
    await first.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await first.waitForTimeout(500)
    expect(existsSync(stubPath(env.workspace))).toBe(false)
  } finally {
    await crashKill(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    await expect(window.locator("body")).toContainText("重启后已中断", { timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-notice-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator("body")).toContainText("重启时这一步还没做完，为了安全没有自动继续。")
    await expect(window.locator("body")).not.toContainText("重启后对不上原来的审批")
    await expect(window.locator('[data-testid="thread-resend"]')).toBeVisible()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="review-gate-card"]')).toBeVisible()
    await expect(window.locator("body")).toContainText("可能改了文件，请核对")
    await expect(window.locator("body")).not.toContainText("1 个文件已改")
    await expect(window.locator('[data-testid="turn-changed-files"]')).toHaveCount(0)
    expect(existsSync(stubPath(env.workspace))).toBe(false)
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
    await expect(window.locator("body")).toContainText("重启后已中断")
    await expect(window.locator("body")).toContainText("重启后对不上原来的审批，这一轮已结束。")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await window.locator('[data-testid="thread-resend"]').click()
    await expectComposerFocusedAtEnd(composer, "please write a note")
    await expect(window.locator("[data-thread-message]").filter({ hasText: "重启后已中断" })).toBeVisible()
    await expect(window.locator('[data-testid="attention-strip"]')).toHaveCount(0)
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
})

test("kill-9 后删 HMAC：放回输入框再发，旧行不抢本轮改动", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await crashKill(env.app)
  deleteApprovalHmacKey(env.userData)
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    const composer = window.locator('[data-testid="composer-input"]')
    await expect(window.locator("body")).toContainText("重启后已中断", { timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-notice-banner"]')).toBeVisible({ timeout: 20_000 })
    const resend = window.locator('[data-testid="thread-resend"]')
    await expect(resend).toBeVisible()
    await expect(resend).toContainText("放回输入框")
    await resend.click()
    await expectComposerFocusedAtEnd(composer, "please write a note")
    await expect(window.locator("[data-thread-message]").filter({ hasText: "重启后已中断" })).toBeVisible()
    await expect(window.locator('[data-testid="approval-allow"]')).toHaveCount(0)
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    const interrupted = window.locator("[data-thread-message]").filter({ hasText: "重启后已中断" })
    await expect(interrupted).toBeVisible()
    await expect(interrupted).toContainText("重启后已中断")
    await expect(interrupted).not.toContainText("已运行 1 个工具")
    await expect(interrupted.locator('[data-testid="turn-changed-files"]')).toHaveCount(0)
    const changed = window.locator('[data-testid="turn-changed-files"]')
    await expect(changed).toHaveCount(1)
    await expect(changed).toContainText("e2e-stub.txt")
    await expect(window.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
})

test("kill-9 后删 HMAC 密钥：重启后已中断，不是已拒绝", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  await crashKill(env.app)
  deleteApprovalHmacKey(env.userData)
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    await expect(window.locator("body")).toContainText("重启后已中断", { timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-notice-banner"]')).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="thread-resend"]')).toBeVisible()
    await expect(window.locator("body")).not.toContainText("已拒绝")
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0)
    expect(existsSync(stubPath(env.workspace))).toBe(false)
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
      .poll(() => {
        try {
          return readStub(input.workspace)
        } catch {
          return ""
        }
      }, { timeout: 20_000 })
      .toContain("from stub")
    await expectApprovalInboxCleared(window)
  } finally {
    await closeForRelaunch(second)
  }
}
