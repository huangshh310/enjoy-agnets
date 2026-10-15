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
// 160x100 蓝色 PNG（截图里看得见）
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAAAsUlEQVR42u3RAQkAAAgEsY9jRBObwxoig0twS/XocbEAsAALsAALsAALMGABFmABFmABFmDAAizAAizAAizAAgxYgAVYgAVYgAUYsAALsAALsAALMGABFmABFmABFmABBizAAizAAizAAgxYgAVYgAVYgAUYsAuABViABViABViAAQuwAAuwAAuwAAMWYAEWYAEWYAEWYMACLMACLMACLMCABViABViABViAAQuwAOteC5G5PJKX/77QAAAAAElFTkSuQmCC",
  "base64"
)

/** 输入框里叫这个名字的图片附件（缩略图按钮的 title 带文件名）。 */
function chipNamed(window: import("@playwright/test").Page, name: string) {
  return window.locator(`[data-testid="composer-asset-chip"]:has([title*="${name}"])`)
}

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
    // 等待期间标题精炼（completion）已跑完：它的 run.end 不能让首句「站住」，回滚后标题照样撤回。
    await window.waitForTimeout(2_000)
    const rows = window.getByTestId("sidebar-session-row")
    await expect(rows.filter({ hasText: "stub-title" })).toHaveCount(0)
    await expect(rows.filter({ hasText: "帮我看看构建为什么挂了" })).toHaveCount(0)
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

test("M4：发出后立刻切到别的会话，后台回滚的字和图切回来都在", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({
    ...dirs(),
    ENJOY_E2E_SEND: "unreachable",
    ENJOY_E2E_SEND_DELAY_MS: "4000",
    ENJOY_E2E_STUB_VISION: "1"
  })
  try {
    const composer = window.getByTestId("composer-input")
    await window.getByTestId("composer-attach").setInputFiles({ name: "m4-a.png", mimeType: "image/png", buffer: PNG })
    await expect(chipNamed(window, "m4-a.png")).toHaveCount(1, { timeout: 8_000 })
    await composer.fill("后台回滚也别丢这句话")
    await composer.press("Enter")
    const active = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    await expect(active).toBeVisible({ timeout: 8_000 })
    const sid = await active.getAttribute("data-session-id")
    expect(sid).toBeTruthy()
    await window.getByTestId("sidebar-new-session").click()
    const row = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sid}"]`).first()
    await expect(row).toHaveAttribute("data-active", "false", { timeout: 8_000 })
    // 等后台那轮出字前失败回滚完。
    await window.waitForTimeout(7_000)
    await row.locator("button").first().click()
    await expect(window.getByTestId("composer-input")).toHaveValue(/后台回滚也别丢这句话/, { timeout: 10_000 })
    // leo r4 soft2：图也回来。
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1, { timeout: 10_000 })
    await expect(chipNamed(window, "m4-a.png")).toHaveCount(1)
    await window.screenshot({ path: join(shots, "05-background-rollback-draft-back.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("leo r4 B1：A 带图发出、出字前贴 B 图排队后切走，A 后台回滚——切回草稿只有 A 的图，B 的图不进草稿", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({
    ...dirs(),
    ENJOY_E2E_SEND: "unreachable",
    ENJOY_E2E_SEND_ONCE: "1",
    ENJOY_E2E_SEND_DELAY_MS: "5000",
    ENJOY_E2E_STUB_VISION: "1"
  })
  try {
    const composer = window.getByTestId("composer-input")
    await window.getByTestId("composer-attach").setInputFiles({ name: "b1-a.png", mimeType: "image/png", buffer: PNG })
    await expect(chipNamed(window, "b1-a.png")).toHaveCount(1, { timeout: 8_000 })
    await composer.fill("A 这句带图")
    await composer.press("Enter")
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(0, { timeout: 8_000 })
    // 出字前：贴 B 图 + 回车 → 进排队。
    await window.getByTestId("composer-attach").setInputFiles({ name: "b1-q.png", mimeType: "image/png", buffer: PNG })
    await expect(chipNamed(window, "b1-q.png")).toHaveCount(1, { timeout: 8_000 })
    await composer.click()
    await window.keyboard.type("B 排队")
    await composer.press("Enter")
    await expect(window.getByTestId("queued-user-turn")).toBeVisible({ timeout: 5_000 })
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(0)
    await window.screenshot({ path: join(shots, "r4-b1-1-queued-before-switch.png") })
    const active = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const sid = await active.getAttribute("data-session-id")
    expect(sid).toBeTruthy()
    await window.getByTestId("sidebar-new-session").click()
    const row = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${sid}"]`).first()
    await expect(row).toHaveAttribute("data-active", "false", { timeout: 8_000 })
    await window.waitForTimeout(8_000)
    await row.locator("button").first().click()
    await expect(window.getByTestId("composer-input")).toHaveValue(/A 这句带图/, { timeout: 10_000 })
    await expect(chipNamed(window, "b1-a.png")).toHaveCount(1, { timeout: 10_000 })
    await expect(chipNamed(window, "b1-q.png"), "B 的图不得冒进草稿").toHaveCount(0)
    await expect(window.getByTestId("composer-asset-chip")).toHaveCount(1)
    await window.waitForTimeout(1_000)
    await window.screenshot({ path: join(shots, "r4-b1-2-back-only-a-image.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

for (const via of ["back", "sidebar"] as const) {
  test(`jojo r5 P1/P2（${via === "back" ? "左上返回" : "侧栏"}切走）：A 后台出字前回滚——字和图不冒进当前会话；切回 A 字和图都在；A 的自动标题撤回，重启后也是`, async () => {
    test.setTimeout(240_000)
    const base = dirs()
    let { app, window } = await boot({
      ...base,
      ENJOY_E2E_SEND: "unreachable",
      ENJOY_E2E_SEND_SKIP: "1",
      ENJOY_E2E_SEND_DELAY_MS: "5000",
      ENJOY_E2E_STUB_VISION: "1"
    })
    try {
      const composer = window.getByTestId("composer-input")
      const activeRow = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
      // 会话一：正常发一轮（站住）。
      await composer.fill("会话一成功")
      await composer.press("Enter")
      await expect(window.locator('[data-chat-stage="true"]')).toContainText("stub-ok", { timeout: 30_000 })
      const one = await activeRow.getAttribute("data-session-id")
      // 新会话 A：带图发出，出字前（5s 后）失败。
      await window.getByTestId("sidebar-new-session").click()
      await expect(composer).toHaveValue("", { timeout: 8_000 })
      await window.getByTestId("composer-attach").setInputFiles({ name: "p1-a.png", mimeType: "image/png", buffer: PNG })
      await expect(chipNamed(window, "p1-a.png")).toHaveCount(1, { timeout: 8_000 })
      await composer.fill("甲句带图A")
      await composer.press("Enter")
      await expect(window.getByTestId("composer-asset-chip")).toHaveCount(0, { timeout: 8_000 })
      await expect(activeRow).not.toHaveAttribute("data-session-id", one ?? "", { timeout: 8_000 })
      const a = await activeRow.getAttribute("data-session-id")
      expect(a).toBeTruthy()
      // 立刻切回会话一。
      const rowOne = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${one}"]`).first()
      const rowA = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${a}"]`).first()
      if (via === "back") {
        // 左上返回：落到历史上一页（会话一或「新对话」落地页，取决于建会话时历史怎么记），都不是 A。
        await window.getByTestId("nav-back").click()
        await expect(rowA).toHaveAttribute("data-active", "false", { timeout: 10_000 })
      } else {
        await rowOne.locator("button").first().click()
        await expect(rowOne).toHaveAttribute("data-active", "true", { timeout: 10_000 })
      }
      const before = await composer.inputValue()
      // 等 A 在后台出字前失败、agent.run 迟到回执也回来。
      await window.waitForTimeout(9_000)
      await window.screenshot({ path: join(shots, `r5-p1-${via}-0-after-wait.png`) })
      // 会话一的输入框保持原样（空）：A 的字不冒进来，A 的失败也不被当成会话一的（不还会话一的旧句）。
      await expect(composer, "A 的字不得冒进当前页").toHaveValue(before)
      await expect(composer).not.toHaveValue(/甲句|会话一成功/)
      await expect(window.getByTestId("thread-credential-network-notice"), "A 的卡不挂到当前页").toHaveCount(0)
      await expect(window.getByTestId("composer-asset-chip"), "A 的图不得冒进当前页").toHaveCount(0)
      await expect(rowA, "A 的自动标题撤回").not.toHaveAttribute("data-session-name", /甲句|stub-title/, { timeout: 8_000 })
      await window.screenshot({ path: join(shots, `r5-p1-${via}-1-session-one-clean.png`) })
      // 切回 A：字和图都在。
      await rowA.locator("button").first().click()
      await expect(composer).toHaveValue(/甲句带图A/, { timeout: 10_000 })
      await expect(chipNamed(window, "p1-a.png")).toHaveCount(1, { timeout: 10_000 })
      await window.screenshot({ path: join(shots, `r5-p1-${via}-2-back-to-a.png`) })
      if (via === "back") {
        await closeForRelaunch(app)
        ;({ app, window } = await boot(base))
        const rowAfter = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${a}"]`).first()
        await expect(rowAfter).toBeVisible({ timeout: 15_000 })
        await expect(rowAfter, "重启后标题仍是撤回后的").not.toHaveAttribute("data-session-name", /甲句|stub-title/)
        await window.screenshot({ path: join(shots, "r5-p2-title-after-restart.png") })
      }
    } finally {
      await closeForRelaunch(app)
    }
  })
}

test("leo r6 BLOCK：A 在跑时左上返回到会话一——会话一不挂 A 的执行中，Enter 直接发出；回到 A 还是 A 自己的运行态", async () => {
  test.setTimeout(240_000)
  const { app, window } = await boot({ ...dirs() })
  try {
    const composer = window.getByTestId("composer-input")
    const activeRow = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const stage = window.locator('[data-chat-stage="true"]')
    await composer.fill("会话一第一句")
    await composer.press("Enter")
    await expect(stage).toContainText("stub-ok 会话一第一句", { timeout: 30_000 })
    const one = await activeRow.getAttribute("data-session-id")
    await window.getByTestId("sidebar-new-session").click()
    await expect(composer).toHaveValue("", { timeout: 8_000 })
    await composer.fill("very slow 甲在跑")
    await composer.press("Enter")
    await expect(window.getByTestId("composer-stop")).toBeVisible({ timeout: 10_000 })
    await expect(activeRow).not.toHaveAttribute("data-session-id", one ?? "", { timeout: 8_000 })
    const a = await activeRow.getAttribute("data-session-id")
    // 只点项目树里的行（「进行中」分组里也有一行 A，排在前面）。
    const rowOne = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${one}"]`)
    const rowA = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${a}"]`)
    // 历史排成「会话一 → A」，左上返回必然落到会话一。
    await rowOne.locator("button").first().click()
    await expect(rowOne).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    // 历史对 350ms 内的连跳只记最后一页（HISTORY_COALESCE_MS）；停一下，像人一样，会话一才单独成一页。
    await window.waitForTimeout(600)
    await composer.fill("会话一的草稿")
    await rowA.locator("button").first().click()
    await expect(rowA).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    await expect(window.getByTestId("composer-stop"), "A 自己在跑").toBeVisible({ timeout: 10_000 })
    await composer.fill("A里后打的字")
    await window.getByTestId("nav-back").click()
    await expect(rowOne).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    await expect(composer, "会话一的草稿还回来").toHaveValue("会话一的草稿", { timeout: 10_000 })
    await expect(window.getByTestId("composer-stop"), "会话一不挂 A 的执行中").toHaveCount(0)
    await expect(stage).not.toContainText("甲在跑")
    await window.screenshot({ path: join(shots, "r6-back-1-session-one-idle.png") })
    // Enter 直接发出（不进排队）。
    await composer.fill("会话一第二句")
    await composer.press("Enter")
    await expect(stage).toContainText("stub-ok 会话一第二句", { timeout: 30_000 })
    await expect(window.getByTestId("queued-user-turn")).toHaveCount(0)
    await window.screenshot({ path: join(shots, "r6-back-2-enter-sends.png") })
    // 回到 A：A 的稿和 A 自己的运行态（还在跑 / 等审批）都在。
    await rowA.locator("button").first().click()
    await expect(composer).toHaveValue("A里后打的字", { timeout: 10_000 })
    await expect(stage).toContainText("甲在跑")
    await window.screenshot({ path: join(shots, "r6-back-3-back-to-a.png") })
  } finally {
    await closeForRelaunch(app)
  }
})

test("jojo r6 P1：左上返回到已被丢弃的空「新对话」——跳过它，不顶着它的标题挂着上一会话的消息，发送照常", async () => {
  test.setTimeout(180_000)
  const { app, window } = await boot({ ...dirs() })
  try {
    const composer = window.getByTestId("composer-input")
    const activeRow = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const stage = window.locator('[data-chat-stage="true"]')
    await composer.fill("会话一第一句")
    await composer.press("Enter")
    await expect(stage).toContainText("stub-ok 会话一第一句", { timeout: 30_000 })
    const one = await activeRow.getAttribute("data-session-id")
    const rowOne = window.locator(`[data-testid="sidebar-session-row"][data-session-id="${one}"]`).first()
    // 开一个空新对话，再点回会话一：空的那个离开时被删。
    await window.getByTestId("sidebar-new-session").click()
    await expect(activeRow).not.toHaveAttribute("data-session-id", one ?? "", { timeout: 8_000 })
    const ghost = await activeRow.getAttribute("data-session-id")
    await rowOne.locator("button").first().click()
    await expect(rowOne).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    await expect(window.locator(`[data-testid="sidebar-session-row"][data-session-id="${ghost}"]`)).toHaveCount(0, { timeout: 10_000 })
    await window.getByTestId("nav-back").click()
    await window.waitForTimeout(1_500)
    await window.screenshot({ path: join(shots, "r6-ghost-1-after-back.png") })
    // 不落在被删的会话上：要么还在会话一（选中、消息是它自己的），要么回空首页（没有消息）。
    const activeNow = await window.locator('[data-testid="sidebar-session-row"][data-active="true"]').count()
    if (activeNow > 0) {
      await expect(rowOne).toHaveAttribute("data-active", "true")
      await expect(stage).toContainText("stub-ok 会话一第一句")
    } else {
      await expect(stage).not.toContainText("会话一第一句")
    }
    await composer.fill("返回后再发一句")
    await composer.press("Enter")
    await expect(stage).toContainText("stub-ok 返回后再发一句", { timeout: 30_000 })
    await expect(window.getByText(/内容已放回输入框/)).toHaveCount(0)
    await window.screenshot({ path: join(shots, "r6-ghost-2-send-ok.png") })
  } finally {
    await closeForRelaunch(app)
  }
})
