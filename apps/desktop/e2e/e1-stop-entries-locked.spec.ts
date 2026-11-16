/**
 * E1 / leo C1b + luna 设计口径：停止没落定（正在停下… / 没能停下）时，会开新一轮的入口——
 * Todo Dock「继续」、用户气泡「编辑」、助手气泡「重新生成」（有就验）——保持可见但置灰（aria-disabled），
 * 悬停 tooltip「停干净后再试」/ "Try again once it stops."；点了不开新一轮、历史不少；落定后自动恢复可用。
 * Todo 列表经 e2e 桥 injectTodoList 挂到最后一条助手消息上（只在 stub 桥上有，不经 IPC），「继续」在输入框上方任务栈（composer-task-stack）。
 */
import { existsSync } from "node:fs"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { bootPendingApproval, closeForRelaunch, firstWindow, mainEntry } from "./approval-restart-helpers"

const stopPhase = (window: Page) =>
  window.evaluate(() => document.querySelector('[data-testid="composer-stop"]')?.getAttribute("data-stop-phase") ?? null)

async function waitPhase(window: Page, want: string | null, timeoutMs: number) {
  await expect.poll(async () => {
    const stopGone = (await window.locator('[data-testid="composer-stop"]').count()) === 0
    const phase = await stopPhase(window)
    return want === null ? stopGone || phase === null : phase === want
  }, { timeout: timeoutMs, intervals: [50] }).toBe(true)
}

const threadSnapshot = (window: Page) =>
  window.evaluate(() => {
    const stage = document.querySelector('[data-chat-stage="true"]')
    return {
      users: [...(stage?.querySelectorAll(".is-user") ?? [])].map((el) => el.textContent?.replace(/\s+/g, " ").trim()),
      assistants: stage?.querySelectorAll(".is-assistant").length ?? 0
    }
  })

async function expectLockedWithHint(window: Page, control: Locator, hint: string) {
  await expect(control).toBeVisible()
  await expect(control).toHaveAttribute("aria-disabled", "true")
  await control.hover({ force: true })
  await expect(window.getByRole("tooltip").filter({ hasText: hint }).first()).toBeVisible({ timeout: 3_000 })
  await window.mouse.move(2, 2)
}

for (const lang of ["zh", "en"] as const) {
  test(`C1b（${lang}）：正在停下 / 没能停下时 Todo 继续、编辑、重新生成置灰 + tooltip；点了不开新一轮；落定后恢复`, async () => {
    test.setTimeout(150_000)
    test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
    const HINT = lang === "en" ? "Try again once it stops." : "停干净后再试"
    const CONT = lang === "en" ? "Continue" : "继续"
    const EDIT = lang === "en" ? "Edit message" : "编辑消息"
    const REGEN = lang === "en" ? "Regenerate response" : "重新生成回复"
    const env = await bootPendingApproval({ lang, extraEnv: { ENJOY_E2E_STUCK_TOOL: "1" } })
    try {
      const window = await firstWindow(env.app)
      await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
      await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
      await window.waitForTimeout(300)
      await window.getByTestId("composer-stop").click()
      await waitPhase(window, "stopping", 2_000)
      for (const phase of ["stopping", "stuck"] as const) {
        if (phase === "stuck") await waitPhase(window, "stuck", 12_000)
        // 收尾事件可能整批改写消息：每态挂一次，直到 Dock 出现
        const cont = window.getByTestId("todo-continue")
        await expect.poll(async () => {
          if ((await cont.count()) === 0) await window.evaluate(() => (globalThis as any).__enjoyE2e?.injectTodoList?.(["a", "b", "c"]))
          return cont.count()
        }, { timeout: 5_000, intervals: [200] }).toBeGreaterThan(0)
        const before = await threadSnapshot(window)
        await expectLockedWithHint(window, cont, HINT)
        await expect(cont).toHaveText(CONT)
        await cont.click({ force: true })
        const edit = window.locator('[data-chat-stage="true"] .is-user').last().getByRole("button", { name: EDIT })
        await expectLockedWithHint(window, edit, HINT)
        await edit.click({ force: true })
        await expect(window.locator('[data-chat-stage="true"] .is-user textarea')).toHaveCount(0)
        const regen = window.getByRole("button", { name: REGEN })
        if ((await regen.count()) > 0) {
          await expectLockedWithHint(window, regen.last(), HINT)
          await regen.last().click({ force: true })
        }
        await window.waitForTimeout(1_200)
        expect(await threadSnapshot(window), `${phase}：不开新一轮、历史不少`).toEqual(before)
        expect(await stopPhase(window)).toBe(phase)
      }
      // 再停一次 → 落定：入口自动恢复可用
      await window.getByTestId("composer-stop").click()
      await waitPhase(window, null, 10_000)
      await expect(window.getByTestId("todo-continue")).not.toHaveAttribute("aria-disabled", "true")
      await expect(window.locator('[data-chat-stage="true"] .is-user').last().getByRole("button", { name: EDIT })).not.toHaveAttribute("aria-disabled", "true")
    } finally {
      await closeForRelaunch(env.app)
    }
  })
}
