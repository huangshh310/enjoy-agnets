/**
 * luna P1：重启后已中断小卡挂在消息流里；待验收条单独贴 Composer 上沿、左右与 Composer 对齐。
 * 733×480 与 1440×920、折叠与展开都不得互相压盖。P2：运行中没改到文件不画改动条。
 * 截图：设 ENJOY_E2E_SHOTS_DIR 时按 尺寸 × 折叠/展开 × 浅/深 落盘。
 */
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import {
  bootPendingApproval,
  closeForRelaunch,
  crashKill,
  firstWindow,
  mainEntry,
  relaunchElectron,
  stubPath
} from "./approval-restart-helpers"
import { sendComposer } from "./send-composer"

const SIZES = [
  { width: 733, height: 480 },
  { width: 1440, height: 920 }
] as const
const shotsDir = process.env.ENJOY_E2E_SHOTS_DIR

type Box = { x: number; y: number; width: number; height: number }

test("重启后已中断小卡在消息流里，待验收条与 Composer 同宽且互不压盖", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval({ slowTool: true })
  try {
    const first = await firstWindow(env.app)
    await first.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    // P2：工具还在跑、还没改到文件：不画「改动 · 全部撤销/全部保留/审查」。
    await expect(first.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 10_000 })
    await first.waitForTimeout(300)
    expect(existsSync(stubPath(env.workspace))).toBe(false)
    await expect(first.locator('[data-testid="composer-live-changes"]')).toHaveCount(0)
    await expect(first.locator('[data-testid="session-review-open"]')).toHaveCount(0)
  } finally {
    await crashKill(env.app)
  }
  const second = await relaunchElectron(env.env)
  try {
    const window = await firstWindow(second)
    const notice = window.locator('[data-testid="thread-notice-banner"]')
    await expect(notice).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="review-gate-card"]')).toBeVisible()
    await expect(window.locator('[data-testid="thread-error-banner"]')).toHaveCount(0)
    await expect(window.locator('[data-testid="thread-resend"]')).toBeVisible()
    await expect(window.locator('[data-testid="review-gate-card"]')).toContainText("未自动提交")
    await expect(window.locator('[data-testid="review-gate-card"]')).toContainText("可能改了文件，请核对")
    // 小卡挂在那一轮「重启后已中断」行下面，在消息列表里。
    await expect(window.locator('[data-testid="chat-conversation"] [data-testid="thread-notice-banner"]')).toHaveCount(1)

    for (const theme of ["light", "dark"] as const) {
      if (theme === "dark") await setTheme(window, "dark")
      for (const size of SIZES) {
        await window.setViewportSize(size)
        await setGateOpen(window, false)
        await expectStackLayout(window, `${size.width} collapsed ${theme}`)
        await snap(window, `${size.width}x${size.height}-collapsed-${theme}`)
        await setGateOpen(window, true)
        await expect(window.locator('[data-testid="review-gate-expanded"]')).toContainText(
          "点通过就算验收完成，不会自动提交或推送。"
        )
        await expect(window.locator('[data-testid="review-gate-card"]')).not.toContainText("在浏览器打开")
        await expectStackLayout(window, `${size.width} expanded ${theme}`)
        await snap(window, `${size.width}x${size.height}-expanded-${theme}`)
      }
    }
    await setGateOpen(window, false)
    await window.locator('[data-testid="review-gate-open"]').click()
    await expect(window.locator('[data-testid="right-pane-shell"]')).toBeVisible({ timeout: 10_000 })
    await expect(window.locator('[data-testid="review-not-git-empty"]')).toBeVisible({ timeout: 10_000 })
  } finally {
    await closeForRelaunch(second)
  }
})

test("写了 .txt 的待验收条：展开列出文件胶囊，不出「在浏览器打开」", async () => {
  test.setTimeout(180_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    await window.locator('[data-testid="approval-allow"]').click({ timeout: 15_000, force: true })
    await expect.poll(() => existsSync(stubPath(env.workspace)), { timeout: 20_000 }).toBe(true)
    await expect(window.locator("body")).toContainText("stub-ok allowed write", { timeout: 20_000 })
    const gate = window.locator('[data-testid="review-gate-card"]')
    await expect(gate).toBeVisible({ timeout: 20_000 })
    await expect(window.locator('[data-testid="review-gate-open"]')).toHaveText("去审查")
    await expect(window.locator('[data-testid="review-gate-reject"]')).toHaveText("打回")
    await expect(window.locator('[data-testid="review-gate-approve"]')).toHaveText("通过")
    await setGateOpen(window, true)
    await expect(window.locator('[data-testid="review-gate-file"]')).toContainText("e2e-stub.txt")
    await expect(gate).not.toContainText("在浏览器打开")
    await expect(gate).not.toContainText("commit")
    for (const size of SIZES) {
      await window.setViewportSize(size)
      await expectReviewAligned(window, `${size.width} txt expanded`)
      await snap(window, `${size.width}x${size.height}-txt-expanded-light`)
    }
  } finally {
    await closeForRelaunch(env.app)
  }
})

/** 三种审批卡：计划概览（写文件）、短命令、长命令（#144 夹具）。 */
const APPROVAL_PROMPTS = [
  ["please write a note", "note"],
  ["run bash ls", "ls"],
  ["run long", "long"]
] as const

test("733×480 待审批：卡限高卡内滚、命令区优先，Composer 与消息区都在，面包屑可读", async () => {
  test.setTimeout(300_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  const env = await bootPendingApproval()
  try {
    const window = await firstWindow(env.app)
    for (const [prompt, slug] of APPROVAL_PROMPTS) {
      if (slug !== "note") {
        await window.setViewportSize(SIZES[1])
        await window.locator('[data-testid="approval-deny"]').click()
        await expect(window.locator('[data-testid="permission-dock"]')).toHaveCount(0, { timeout: 15_000 })
        await sendComposer(window, window.locator('[data-testid="composer-input"]'), prompt)
        await window.locator('[data-testid="approval-allow"]').waitFor({ timeout: 20_000 })
      }
      for (const theme of ["light", "dark"] as const) {
        await setTheme(window, theme)
        for (const size of SIZES) {
          await window.setViewportSize(size)
          await window.waitForTimeout(500)
          await snap(window, `${size.width}x${size.height}-approval-${slug}-${theme}`)
          await expectApprovalLayout(window, `${size.width} approval ${slug} ${theme}`, size.height)
        }
      }
      await setTheme(window, "light")
    }
  } finally {
    await closeForRelaunch(env.app)
  }
})

/** Composer 输入框最小高度（ai-chat-composer 自适应下限 52px）。 */
const COMPOSER_INPUT_MIN = 52
/** 审批时消息区至少露一行。 */
const MESSAGES_MIN_VISIBLE = 24

async function expectApprovalLayout(window: Page, label: string, viewportHeight: number): Promise<void> {
  const dock = await box(window.locator('[data-testid="permission-dock"]'))
  const card = window.locator('[data-testid="permission-dock"] article')
  const cardBox = await box(card)
  const form = await box(window.locator("form[data-composer]"))
  const input = await box(window.locator('[data-testid="composer-input"]'))
  const thread = await box(window.locator('[data-testid="chat-conversation"] > div').first())
  const debug = JSON.stringify({ thread, dock, card: cardBox, form })
  expect(input.height, `${label}: composer input squeezed`).toBeGreaterThanOrEqual(COMPOSER_INPUT_MIN - 0.5)
  expect(form.y + form.height, `${label}: composer cut off`).toBeLessThanOrEqual(viewportHeight)
  // 消息区不被卡挤成 0：至少露一行。
  expect(thread.height, `${label}: messages squeezed ${debug}`).toBeGreaterThanOrEqual(MESSAGES_MIN_VISIBLE)
  expect(thread.y + thread.height, `${label}: messages under card`).toBeLessThanOrEqual(dock.y + 1)
  // 同一条审批的卡已摊开时，「需处理」条不重复占行。
  await expect(window.locator('[data-testid="attention-needs-bar"]')).toHaveCount(0)
  // 卡在对话列（消息流）里，不占 Composer 的位置：Composer 完整可见、在对话列之下。
  await expect(window.locator('[data-testid="chat-conversation"] [data-testid="permission-dock"]')).toHaveCount(1)
  const conv = await box(window.locator('[data-testid="chat-conversation"]'))
  expect(form.y, `${label}: composer under conversation`).toBeGreaterThanOrEqual(conv.y + conv.height - 1)
  const formFull = await window.locator("form[data-composer]").evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
  expect(formFull, `${label}: composer clipped`).toBe(true)
  expect(intersects(cardBox, form), `${label}: card ∩ composer ${debug}`).toBe(false)
  expect(dock.y + dock.height, `${label}: dock overlaps composer`).toBeLessThanOrEqual(form.y + 1)
  const review = window.locator('[data-testid="composer-review-frame"]:visible')
  if ((await review.count()) > 0) {
    expect(intersects(cardBox, await box(review)), `${label}: card ∩ review bar`).toBe(false)
  }
  // 一套高度规则：command 卡命令区优先、不被压；其余卡限高，正文卡内滚。
  const variant = await card.getAttribute("data-variant")
  if (variant === "command") {
    const pre = await window.locator('[data-testid="approval-command"]').evaluate((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight)
      const lines = Math.max(1, Math.round(el.scrollHeight / lineHeight))
      const body = el.closest<HTMLElement>('[data-testid="approval-card-body"]')
      return {
        clientHeight: el.clientHeight,
        need: Math.min(lines, 2) * lineHeight - 1,
        bodyScrolls: body ? body.scrollHeight > body.clientHeight + 1 : false
      }
    })
    expect(pre.clientHeight, `${label}: command area squeezed`).toBeGreaterThanOrEqual(pre.need)
    expect(pre.bodyScrolls, `${label}: command scrolled inside card`).toBe(false)
  } else {
    const scroll = await card.evaluate((el) => {
      const body = el.querySelector<HTMLElement>('[data-testid="approval-card-body"]')
      const overflows = body ? body.scrollHeight > body.clientHeight + 1 : false
      if (body && overflows) body.scrollTop = body.scrollHeight
      return {
        maxHeight: getComputedStyle(el).maxHeight,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : "",
        overflows,
        scrolled: (body?.scrollTop ?? 0) > 0
      }
    })
    expect(scroll.maxHeight, `${label}: card has no max height`).not.toBe("none")
    expect(scroll.bodyOverflowY).toBe("auto")
    if (scroll.overflows) expect(scroll.scrolled, `${label}: card does not scroll`).toBe(true)
  }
  for (const id of ["approval-allow", "approval-deny"]) {
    const button = await box(window.locator(`[data-testid="${id}"]`))
    expect(
      button.y >= dock.y && button.y + button.height <= dock.y + dock.height + 1,
      `${label}: ${id} hidden ${JSON.stringify({ button, dock, card: cardBox, form })}`
    ).toBe(true)
  }
  // 面包屑不缩成「w…」：项目名至少 4.5rem 或完整显示。
  const crumb = await window.locator('[data-testid="chat-breadcrumb-project"]').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    full: el.scrollWidth <= el.clientWidth + 1
  }))
  expect(crumb.full || crumb.width >= 72, `${label}: breadcrumb truncated to ${crumb.width}px`).toBe(true)
  await expect(window.locator('[data-testid="chat-breadcrumb-title"]')).toBeVisible()
  // 标题与页脚标签窄时省略号截断，不缩成单个字。
  await expectReadableLabel(window.locator('[data-testid="chat-breadcrumb-title"]'), `${label}: title`)
  await expectReadableLabel(window.locator('[data-toast-clearance] button span.truncate').first(), `${label}: footer branch`)
  await expectReadableLabel(window.locator('[data-toast-clearance] button span.truncate').nth(1), `${label}: footer project`)
}

async function expectReadableLabel(locator: Locator, label: string): Promise<void> {
  const info = await locator.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    full: el.scrollWidth <= el.clientWidth + 1,
    ellipsis: getComputedStyle(el).textOverflow
  }))
  expect(info.full || (info.width >= 32 && info.ellipsis === "ellipsis"), `${label} cut to ${info.width}px`).toBe(true)
}

async function setGateOpen(window: Page, open: boolean): Promise<void> {
  const expanded = window.locator('[data-testid="review-gate-expanded"]')
  if ((await expanded.count()) > 0 !== open) {
    await window.locator('[data-testid="review-gate-card"] button').first().click()
  }
  await expect(expanded).toHaveCount(open ? 1 : 0)
  await window.waitForTimeout(400)
}

async function expectStackLayout(window: Page, label: string): Promise<void> {
  const notice = await box(window.locator('[data-testid="thread-notice-banner"]'))
  const conv = await box(window.locator('[data-testid="chat-conversation"]'))
  const frame = await expectReviewAligned(window, label)
  const form = await box(window.locator("form[data-composer]"))
  expect(
    intersects(notice, frame),
    `${label}: notice ∩ review bar ${JSON.stringify({ notice, frame, conv })}`
  ).toBe(false)
  expect(intersects(notice, form), `${label}: notice ∩ composer`).toBe(false)
  // 消息区还在、没被待验收条盖住：条在会话区之下。
  expect(conv.height, `${label}: conversation squeezed out`).toBeGreaterThan(40)
  expect(frame.y, `${label}: review bar covers messages`).toBeGreaterThanOrEqual(conv.y + conv.height - 1)
  expect(frame.y + frame.height, `${label}: review bar covers composer`).toBeLessThanOrEqual(form.y + 1)
  // 小卡在消息列表里：可视部分落在会话区内，且在中断行之下。
  expect(notice.y + notice.height, `${label}: notice below list`).toBeLessThanOrEqual(conv.y + conv.height + 1)
  const row = await box(
    window.locator("[data-thread-message]").filter({ hasText: "重启后已中断" }).last()
  )
  expect(notice.y, `${label}: notice above its run row`).toBeGreaterThanOrEqual(row.y + row.height - 1)
}

async function expectReviewAligned(window: Page, label: string): Promise<Box> {
  const frame = await box(window.locator('[data-testid="composer-review-frame"]'))
  const form = await box(window.locator("form[data-composer]"))
  expect(Math.abs(frame.x - form.x), `${label}: left edge`).toBeLessThanOrEqual(1)
  expect(Math.abs(frame.x + frame.width - (form.x + form.width)), `${label}: right edge`).toBeLessThanOrEqual(1)
  expect(frame.y + frame.height, `${label}: review bar overlaps composer`).toBeLessThanOrEqual(form.y + 1)
  // 待验收条紧贴 Composer：间距 ≤ 12px（luna：原约 52px 收到约 8px）。
  const gap = form.y - (frame.y + frame.height)
  console.log(`[review-gap] ${label} ${gap.toFixed(1)}px`)
  expect(gap, `${label}: review bar ↔ composer gap ${gap}px`).toBeLessThanOrEqual(12)
  return frame
}

async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox()
  expect(value).toBeTruthy()
  return value as Box
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

async function setTheme(window: Page, theme: "light" | "dark"): Promise<void> {
  const dark = await window.evaluate(() => document.documentElement.classList.contains("dark"))
  if (dark === (theme === "dark")) return
  await window.getByRole("button", { name: theme === "dark" ? "深色" : "浅色" }).click()
  await expect
    .poll(() => window.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(theme === "dark")
  await window.waitForTimeout(1_000)
}

async function snap(window: Page, name: string): Promise<void> {
  if (!shotsDir) return
  mkdirSync(shotsDir, { recursive: true })
  await window.screenshot({ path: join(shotsDir, `${name}.png`) })
}
