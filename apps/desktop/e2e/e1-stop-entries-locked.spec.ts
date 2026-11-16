/**
 * E1 / leo C1b + luna 设计口径：停止没落定（正在停下… / 没能停下）时，会开新一轮的入口——
 * Todo Dock「继续」、用户气泡「编辑」、助手气泡「重新生成」（有就验）——保持可见但置灰（aria-disabled），
 * 悬停 tooltip「停干净后再试」/ "Try again once it stops."；点了不开新一轮、历史不少；落定后自动恢复可用。
 * Todo 列表经 e2e 桥 injectTodoList 挂到最后一条助手消息上（只在 stub 桥上有，不经 IPC），「继续」在输入框上方任务栈（composer-task-stack）。
 * 「重新生成」必验（neo e1 后续）：先发一句普通话拿到一条带正文的助手轮（有「重新生成」），再发会弹审批的那句、允许后停在「没能停下」。
 * 锁住时点它不弹确认、不开新一轮；落定后真点一次 → 确认 → 截掉后面那轮重跑这一轮。
 * 流水线「启动」（workflows-page startPipeline）同样在当前会话跑 agent.run：锁住时点了不建 workflow run，落定后点了建出一条（行为，不靠源码正则）。
 */
import { existsSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type ElectronApplication, type Locator, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const FIRST = "第一句 alpha"

/**
 * 先发一句普通话（stub 回「stub-ok 第一句 alpha」，这一轮有正文 → 有「重新生成」），
 * 再发会弹写盘审批的那句；允许后 ENJOY_E2E_STUCK_TOOL 让工具钉住，点停止进入收尾。
 */
async function bootStuckWithPriorTurn(lang: "zh" | "en"): Promise<{ app: ElectronApplication; window: Page }> {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-e2e-e1lock-ws-"))
  const userData = mkdtempSync(join(tmpdir(), "enjoy-e2e-e1lock-ud-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e workspace\n")
  const app = await relaunchElectron({
    ...process.env,
    ENJOY_E2E_STUB: "1",
    ENJOY_E2E_LANG: lang,
    ENJOY_E2E_CHAT_READY: "key",
    ENJOY_E2E_WORKSPACE: workspace,
    ENJOY_E2E_USERDATA: userData,
    ENJOY_E2E_STUCK_TOOL: "1"
  })
  try {
    const window = await firstWindow(app)
    const composer = window.locator('[data-testid="composer-input"]')
    await sendComposer(window, composer, FIRST)
    await expect(window.locator("body")).toContainText(`stub-ok ${FIRST}`, { timeout: 20_000 })
    await expect(window.locator('[data-testid="composer-send"]')).toHaveAttribute("aria-label", /Send|发送/, { timeout: 20_000 })
    await sendComposer(window, composer, "please write a note")
    await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 15_000 })
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    await window.waitForTimeout(300)
    await window.getByTestId("composer-stop").click()
    await waitPhase(window, "stopping", 2_000)
    return { app, window }
  } catch (error) {
    await closeForRelaunch(app)
    throw error
  }
}

/** 第一轮（带正文）的助手气泡上的「重新生成」。 */
const firstRegen = (window: Page, name: string) =>
  window
    .locator('[data-chat-stage="true"] .is-assistant')
    .filter({ hasText: `stub-ok ${FIRST}` })
    .first()
    .getByRole("button", { name })

const workflowRunCount = (window: Page) =>
  window.evaluate(async () => {
    const runs = (await (globalThis as any).ide.workflow.list({})) as unknown[]
    return runs.length
  })

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
    const { app, window } = await bootStuckWithPriorTurn(lang)
    try {
      // 前置：第一轮助手气泡上一定有「重新生成」（不再「有就验」）
      const regen = firstRegen(window, REGEN)
      await expect(regen).toHaveCount(1)
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
        await expectLockedWithHint(window, regen, HINT)
        await regen.click({ force: true })
        await window.waitForTimeout(1_200)
        await expect(window.getByTestId("regenerate-confirm-dialog"), `${phase}：锁住时不弹「后面几轮会删掉」确认`).toHaveCount(0)
        expect(await threadSnapshot(window), `${phase}：不开新一轮、历史不少`).toEqual(before)
        expect(await stopPhase(window)).toBe(phase)
      }
      // 再停一次 → 落定：入口自动恢复可用
      await window.getByTestId("composer-stop").click()
      await waitPhase(window, null, 10_000)
      await expect(window.getByTestId("todo-continue")).not.toHaveAttribute("aria-disabled", "true")
      await expect(window.locator('[data-chat-stage="true"] .is-user').last().getByRole("button", { name: EDIT })).not.toHaveAttribute("aria-disabled", "true")
      // 落定后「重新生成」真点一次：不再置灰 → 弹确认（后面还有一轮）→ 确认后截掉后面那轮、这一轮重跑
      await expect(regen).not.toHaveAttribute("aria-disabled", "true")
      await regen.click({ force: true })
      await expect(window.getByTestId("regenerate-confirm-dialog")).toBeVisible({ timeout: 5_000 })
      await window.getByTestId("regenerate-confirm").click()
      await expect
        .poll(async () => (await threadSnapshot(window)).users.length, { timeout: 20_000, message: "重新生成后截掉了后面那轮" })
        .toBe(1)
      await expect(window.locator('[data-chat-stage="true"] .is-assistant').filter({ hasText: `stub-ok ${FIRST}` })).toHaveCount(1, { timeout: 20_000 })
      await expect(window.locator("body")).not.toContainText("please write a note")
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("C1b（zh）：流水线「启动」收尾没落定时不建 workflow run；落定后照常起跑", async () => {
  test.setTimeout(150_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const { app, window } = await bootStuckWithPriorTurn("zh")
  try {
    await waitPhase(window, "stuck", 12_000)
    const openWorkflows = async () => {
      await window.evaluate(() => {
        location.hash = "#/workflows"
      })
      await window.waitForSelector('[data-testid="workflow-start"]', { timeout: 8_000 })
      if ((await window.locator('[data-testid="workflow-dag"]').count()) === 0) {
        await window.locator('[data-testid="workflow-create"]').click()
        await window.waitForSelector('[data-testid="workflow-dag"]', { timeout: 8_000 })
      }
    }
    const backToChat = async () => {
      await window.evaluate(() => {
        location.hash = "#/"
      })
      await window.locator('[data-testid="composer-input"]').waitFor({ timeout: 12_000 })
    }
    await openWorkflows()
    const before = await workflowRunCount(window)
    await window.locator('[data-testid="workflow-start"]').click()
    await window.waitForTimeout(1_500)
    expect(await workflowRunCount(window), "锁住：没建 workflow run").toBe(before)
    // 回到会话：仍是「没能停下」（锁是单调的，点「启动」时一定也锁着）
    await backToChat()
    expect(await stopPhase(window)).toBe("stuck")
    // 再停一次 → 落定
    await window.getByTestId("composer-stop").click()
    await waitPhase(window, null, 10_000)
    await openWorkflows()
    await window.locator('[data-testid="workflow-start"]').click()
    await expect
      .poll(() => workflowRunCount(window), { timeout: 10_000, message: "落定后：启动建出一条 workflow run" })
      .toBe(before + 1)
  } finally {
    await closeForRelaunch(app)
  }
})
