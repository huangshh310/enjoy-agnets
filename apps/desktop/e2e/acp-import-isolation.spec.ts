/**
 * jojo P1（#136 r6 gate）：会话 B 在跑、停在写盘审批时，从引擎面板导入一条本机 ACP 会话——
 * 导入的会话必须是空闲的：没有 B 的审批卡 / 执行中 / 停止按钮；B 停到后台继续等审批，回到 B 卡还在、批的是 B。
 * 另：导入的会话（0 条消息）离开时 / 重启后都还在侧栏（luna g157b）；自定义 ACP 助手也能列出本机会话（luna -71）。
 * 本机助手用一个假的自定义 ACP 助手（NDJSON：initialize 广告 session、session/list 回一条），不碰真 CLI。
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { expect, test, type Page } from "@playwright/test"
import { closeForRelaunch, firstWindow, mainEntry, relaunchElectron } from "./approval-restart-helpers"

const shots = process.env.ENJOY_E2E_SHOTS_DIR ?? join(process.cwd(), "test-results/acp-import-isolation")
const IMPORTED_TITLE = "本机助手的旧会话"

const FAKE_ACP = `#!/usr/bin/env node
// e2e 假 ACP 助手：只答 initialize / session/list，其余请求回空结果。
let buf = ""
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\\n")
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  buf += chunk
  let i
  while ((i = buf.indexOf("\\n")) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line || !line.startsWith("{")) continue
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.id === undefined || !msg.method) continue
    if (msg.method === "initialize") {
      send({ id: msg.id, result: { protocolVersion: msg.params?.protocolVersion ?? 1, capabilities: { session: {} }, agentCapabilities: {} } })
    } else if (msg.method === "session/list") {
      send({ id: msg.id, result: { sessions: [{ sessionId: "fake-acp-1", cwd: msg.params?.cwd, title: ${JSON.stringify(IMPORTED_TITLE)} }] } })
    } else {
      send({ id: msg.id, result: {} })
    }
  }
})
`

function setup() {
  const workspace = mkdtempSync(join(tmpdir(), "enjoy-acpimp-ws-"))
  writeFileSync(join(workspace, "readme.md"), "# e2e\n")
  const binDir = mkdtempSync(join(tmpdir(), "enjoy-acpimp-bin-"))
  const agent = join(binDir, "acp-agent")
  writeFileSync(agent, FAKE_ACP)
  chmodSync(agent, 0o755)
  return {
    agent,
    env: { ENJOY_E2E_WORKSPACE: workspace, ENJOY_E2E_USERDATA: mkdtempSync(join(tmpdir(), "enjoy-acpimp-ud-")) }
  }
}

/**
 * 直接把假助手写进库（settings.agentTools.customAgents）。走 agentTools.upsertCustom 会去要系统钥匙串
 * （Linux CI / xvfb 没有，env 为空也要），和这里要验的导入无关。
 */
function seedCustomAgent(userData: string, command: string) {
  const db = new DatabaseSync(join(userData, "app.db"))
  try {
    const row = { id: "custom:fake-acp", label: "假本机助手", command, args: [], env: {}, cwdMode: "workspace", enabled: true }
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run("agentTools.customAgents", JSON.stringify([row]))
  } finally {
    db.close()
  }
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

const shot = (window: Page, name: string) => window.screenshot({ path: join(shots, `${name}.png`) })

test.beforeAll(() => {
  test.skip(!existsSync(mainEntry), "out/main/index.js missing; run desktop build first")
  mkdirSync(shots, { recursive: true })
})

test("B 等审批时导入本机 ACP 会话：导入的会话空闲、不挂 B 的卡；回到 B 卡还在；导入的会话离开 / 重启后仍在侧栏", async () => {
  test.setTimeout(300_000)
  const { agent, env } = setup()
  // 先起一次建库（跑迁移），关掉后写入假助手，再起。
  let { app, window } = await boot(env)
  await closeForRelaunch(app)
  seedCustomAgent(env.ENJOY_E2E_USERDATA, agent)
  ;({ app, window } = await boot(env))
  try {
    const composer = window.getByTestId("composer-input")
    const activeRow = window.locator('[data-testid="sidebar-session-row"][data-active="true"]').first()
    const stage = window.locator('[data-chat-stage="true"]')
    const approve = window.getByTestId("approval-allow")
    const stop = window.getByTestId("composer-stop")

    // 会话 B：very slow 中途停在写盘审批。
    await composer.fill("very slow 乙在跑")
    await composer.press("Enter")
    await expect(approve).toBeVisible({ timeout: 40_000 })
    const b = await activeRow.getAttribute("data-session-id")
    await shot(window, "acp-1-B-waiting-approval")

    // 引擎面板 → 假本机助手 → 导入本机会话 → 点那一条。
    await window.getByTestId("composer-engine-chip").click()
    const panel = window.getByTestId("agent-picker-panel")
    await expect(panel).toBeVisible()
    await panel.getByRole("tab", { name: "假本机助手" }).click()
    await panel.getByRole("button", { name: "导入本机会话" }).click()
    const row = panel.getByRole("button", { name: IMPORTED_TITLE })
    await expect(row, "自定义助手列出了本机会话（luna -71）").toBeVisible({ timeout: 20_000 })
    await shot(window, "acp-2-custom-agent-lists-sessions")
    await row.click()

    // 导入的会话：空闲，不挂 B 的卡 / 执行中 / 停止。
    await expect(activeRow).not.toHaveAttribute("data-session-id", b ?? "", { timeout: 15_000 })
    const imported = await activeRow.getAttribute("data-session-id")
    await expect(window.locator('[data-testid="sidebar-session-row"][data-active="true"]', { hasText: IMPORTED_TITLE }).first()).toBeVisible()
    await window.keyboard.press("Escape")
    await expect(approve, "导入的会话没有 B 的审批卡").toHaveCount(0)
    await expect(stop, "导入的会话没有停止按钮").toHaveCount(0)
    await expect(stage).not.toContainText("乙在跑")
    await expect(composer).not.toHaveAttribute("placeholder", /任务进行中/)
    await shot(window, "acp-3-imported-idle")

    // 左上返回到 B：B 的卡还在、仍在跑；在 B 里批准，B 继续出字。
    await window.getByTestId("nav-back").click()
    const rowB = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${b}"]`)
    await expect(rowB).toHaveAttribute("data-active", "true", { timeout: 10_000 })
    await expect(approve, "回到 B，B 的审批卡还在").toBeVisible({ timeout: 10_000 })
    await expect(stage).toContainText("乙在跑")
    await shot(window, "acp-4-back-to-B-card-kept")
    await approve.click()
    await expect(stage).toContainText("ten", { timeout: 60_000 })
    await shot(window, "acp-5-B-approved-finished")

    // 导入的会话（0 条消息）离开后仍在侧栏。
    const importedRow = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${imported}"]`)
    await window.waitForTimeout(1_500)
    await expect(importedRow, "离开后导入的会话还在").toHaveCount(1)

    // 重启后仍在侧栏。
    await closeForRelaunch(app)
    ;({ app, window } = await boot(env))
    const afterRestart = window.locator(`[data-testid="sidebar-session-row"][data-session-surface="tree"][data-session-id="${imported}"]`)
    await expect(afterRestart, "重启后导入的会话还在").toHaveCount(1, { timeout: 15_000 })
    await expect(afterRestart).toContainText(IMPORTED_TITLE)
    await shot(window, "acp-6-imported-kept-after-restart")
  } finally {
    await closeForRelaunch(app)
  }
})
