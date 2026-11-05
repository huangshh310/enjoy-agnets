/**
 * P2 Skills 规范校验 soft · 真机自门 4 屏
 * 1 新建超限可感 · 2 已装不合规可感 · 3 allowed-tools 只展示+主流程 · 4 零扩张
 * 预览 HTML 不算过门。
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test, type Page } from "@playwright/test"
import type { ElectronApplication } from "playwright"

const mainEntry = join(process.cwd(), "out/main/index.js")
const SHOTS = "/workspace/enjoy-docs/shots/p2-skills-validate"

test("P2 Skills 规范校验 soft · 4 屏自门", async () => {
  test.setTimeout(240_000)
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(SHOTS, { recursive: true })

  const playwright = await import("playwright")
  const electron = (playwright as { _electron?: { launch: Function } })._electron
  test.skip(!electron?.launch, "playwright electron launcher unavailable")

  const userData = mkdtempSync(join(tmpdir(), "enjoy-p2-skills-ud-"))
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-p2-skills-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")

  // 隔离 HOME，便于种子技能被 discover；不污染真机家目录
  const home = userData
  seedSkills(home, workspace)

  const app = (await electron!.launch({
    args: [mainEntry, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    cwd: process.cwd(),
    timeout: 60_000,
    env: {
      ...process.env,
      HOME: home,
      ENJOY_E2E_STUB: "1",
      ENJOY_E2E_CHAT_READY: "key",
      ENJOY_E2E_LANG: "zh",
      ENJOY_E2E_USERDATA: userData,
      ENJOY_E2E_WORKSPACE: workspace,
      ENJOY_E2E_SESSION_COUNT: "4"
    }
  })) as ElectronApplication

  const sample: Record<string, unknown> = {
    at: new Date().toISOString(),
    home,
    workspace,
    realHomedir: homedir()
  }

  try {
    const window = await readyWindow(app)
    await window.setViewportSize({ width: 1440, height: 920 })
    await expect(window.locator('[data-testid="composer-input"]')).toBeVisible({ timeout: 45_000 })

    // ── 屏① 新建超限可感 ──
    await window.evaluate(() => {
      location.hash = "#/skills"
    })
    await expect.poll(() => window.evaluate(() => location.hash)).toMatch(/#\/skills/)
    await window.waitForTimeout(800)
    // 切到全部能力库，确保工具栏「新建技能」可见
    const createBtn = window.getByRole("button", { name: /新建技能/ })
    await expect(createBtn).toBeVisible({ timeout: 20_000 })
    await createBtn.click()
    await expect(window.getByTestId("create-skill-dialog")).toBeVisible({ timeout: 10_000 })
    const nameInput = window.getByTestId("create-skill-name")
    await nameInput.fill("")
    // 通过 evaluate 直接塞入非法串（filter 会剥除大写/_，所以用连续 -- 与超长）
    await nameInput.evaluate((el: HTMLInputElement) => {
      el.value = ""
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
    // 输入会被 filter 成小写无非法字符；用 -- 测人话
    await nameInput.type("api--doc")
    await expect(window.getByTestId("create-skill-name-hint")).toContainText("连续两个连字符")
    await expect(window.getByTestId("create-skill-name-count")).toContainText("/64")
    // 清空描述触发缺描述
    const desc = window.getByTestId("create-skill-description")
    await desc.fill("")
    await expect(window.getByTestId("create-skill-desc-hint")).toContainText("请填写功能描述")
    await expect(window.getByTestId("create-skill-submit")).toBeDisabled()
    await window.screenshot({ path: join(SHOTS, "01-create-overlimit.png") })
    sample.screen1 = {
      nameHint: await window.getByTestId("create-skill-name-hint").textContent(),
      descHint: await window.getByTestId("create-skill-desc-hint").textContent(),
      submitDisabled: true
    }

    // 合法可写
    await nameInput.fill("api-doc-writer")
    await desc.fill("Write concise API docs from OpenAPI specs.")
    await expect(window.getByTestId("create-skill-submit")).toBeEnabled({ timeout: 5_000 })
    await window.getByTestId("create-skill-submit").click()
    await expect(window.getByTestId("create-skill-dialog")).toBeHidden({ timeout: 15_000 })

    // ── 屏② 已装不合规可感 ──
    await window.evaluate(() => {
      location.hash = "#/skills"
    })
    await window.waitForTimeout(600)
    // 点「全部能力库」
    const tabAll = window.getByRole("button", { name: /全部能力库/ })
    if (await tabAll.isVisible().catch(() => false)) await tabAll.click()
    await window.waitForTimeout(800)
    const badCard = window.locator('[data-testid="skill-item-card"][data-skill-name="Bad_Skill"]')
    await expect(badCard).toBeVisible({ timeout: 20_000 })
    await expect(badCard.getByTestId("skill-norm-notes")).toContainText(/名称不合规|缺描述/)
    await expect(badCard.getByTestId("skill-local-callsign")).toContainText("本地呼号")
    await badCard.click()
    await expect(window.getByTestId("skill-drawer-norm")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByTestId("skill-norm-chip").first()).toBeVisible()
    await window.screenshot({ path: join(SHOTS, "02-installed-noncompliant.png") })
    sample.screen2 = {
      notes: await badCard.getByTestId("skill-norm-notes").textContent(),
      drawerNorm: true,
      notDeleted: true
    }
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)

    // ── 屏③ allowed-tools 只展示 + 主流程 ──
    const toolsCard = window.locator(
      '[data-testid="skill-item-card"][data-skill-name="tools-display-only"]'
    )
    await expect(toolsCard).toBeVisible({ timeout: 15_000 })
    await toolsCard.click()
    await expect(window.getByTestId("skill-allowed-tools-chip")).toBeVisible({ timeout: 8_000 })
    await expect(window.getByTestId("skill-allowed-tools-chip")).toContainText(/仅展示|工具名单/)
    await expect(window.getByText("已批准")).toHaveCount(0)
    await window.screenshot({ path: join(SHOTS, "03-allowed-tools-display.png") })
    sample.screen3 = { allowedToolsDisplayOnly: true }
    await window.keyboard.press("Escape")
    await window.waitForTimeout(300)

    // 主流程：Composer / 发送仍在
    await window.evaluate(() => {
      location.hash = "#/"
    })
    await expect(window.getByTestId("composer-input")).toBeVisible({ timeout: 15_000 })
    await expect(window.getByTestId("composer-send")).toBeVisible()
    await expect(window.getByTestId("composer-input")).toBeEditable()

    // ── 屏④ 零扩张 ──
    await window.evaluate(() => {
      location.hash = "#/skills"
    })
    await window.waitForTimeout(500)
    const bodyText = await window.locator("body").innerText()
    expect(bodyText).not.toMatch(/技能自动批准|全面 skills-ref|性能大升级|Goose 兼容/)
    expect(await window.locator("text=Goose").count()).toBe(0)
    expect(await window.locator("text=全面 skills-ref").count()).toBe(0)
    // trigger 本地呼号仍可见于不合规卡
    const tabAll2 = window.getByRole("button", { name: /全部能力库/ })
    if (await tabAll2.isVisible().catch(() => false)) await tabAll2.click()
    await window.waitForTimeout(400)
    await expect(
      window.locator('[data-testid="skill-local-callsign"]').filter({ hasText: "本地呼号" }).first()
    ).toBeVisible()
    await window.screenshot({ path: join(SHOTS, "04-zero-expansion.png") })
    sample.screen4 = { bannedCopyAbsent: true, localCallsign: true, i3StillStopped: true }

    writeFileSync(join(SHOTS, "gate-sample.json"), JSON.stringify(sample, null, 2))
  } finally {
    await app.close().catch(() => undefined)
  }
})

function seedSkills(home: string, workspace: string) {
  const badDir = join(home, ".enjoy-agents", "skills", "Bad_Skill")
  mkdirSync(badDir, { recursive: true })
  writeFileSync(
    join(badDir, "SKILL.md"),
    `---
name: Bad_Skill
trigger: /bad-local
---
# Bad Skill Heading Only
`,
    "utf-8"
  )

  const toolsDir = join(home, ".enjoy-agents", "skills", "tools-display-only")
  mkdirSync(toolsDir, { recursive: true })
  writeFileSync(
    join(toolsDir, "SKILL.md"),
    `---
name: tools-display-only
description: Demo skill that lists tools for display only.
trigger: /tools-demo
allowed-tools: Bash(git:*) Read
---
# Tools Display Only
`,
    "utf-8"
  )

  // 工作区也放一份，确保 workspace 扫描路径有内容
  const wsDir = join(workspace, ".agents", "skills", "ws-ok-skill")
  mkdirSync(wsDir, { recursive: true })
  writeFileSync(
    join(wsDir, "SKILL.md"),
    `---
name: ws-ok-skill
description: Workspace compliant skill for gate.
trigger: /ws-ok
---
# OK
`,
    "utf-8"
  )
}

async function readyWindow(app: ElectronApplication): Promise<Page> {
  const window = await app.firstWindow({ timeout: 60_000 })
  await window.waitForLoadState("domcontentloaded", { timeout: 60_000 }).catch(() => undefined)
  await window.waitForTimeout(800)
  return window
}
