/**
 * E2E 启动：隔离 userData 后写入工作区、Ollama 档案（无需 Key）、默认模型与会话。
 */
import { app } from "electron"
import { mkdir, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"
import { setSetting } from "./database"
import { seedE2eChatReadyRoute } from "./e2e-chat-ready-seed"
import { e2eChatReadyKind } from "./e2e-chat-readiness"
import { e2eWorkspaceCount } from "./e2e-workspace-count"
import { isE2eStub } from "./e2e-stub"
import { createSession, listSessions } from "./session-queries"
import { upsertProfile } from "./secrets"
import { openWorkspace } from "./workspace"
import { seedE2eAutomations } from "./e2e-stub-automations"
import { shouldSeedE2eLedger } from "./e2e-stub-ledger-data"
import { seedE2eLedgerSession } from "./e2e-stub-ledger"
import { e2eSessionCount } from "./e2e-session-count"

export async function bootstrapE2eStub(): Promise<void> {
  if (!isE2eStub(app.isPackaged)) return
  const root = process.env.ENJOY_E2E_WORKSPACE
  if (!root) return
  const first = await seedE2eWorkspace(root, "e2e workspace")
  setSetting("lastWorkspaceId", first.id)
  setSetting("defaultModelId", "stub-e2e")
  await seedE2eProfile()
  try {
    await seedE2eChatReadyRoute({
      packaged: app.isPackaged,
      userData: app.getPath("userData")
    })
  } catch (error) {
    console.warn("e2e chat-ready route skipped", error)
  }
  await seedE2eSessions(first.id)
  if (e2eWorkspaceCount() >= 2) {
    const secondRoot = join(dirname(root), `${basename(root)}-b`)
    const second = await seedE2eWorkspace(secondRoot, "e2e workspace b")
    await seedE2eSessions(second.id)
  }
  if (shouldSeedE2eLedger()) await seedE2eLedgerSession(first.id)
  seedE2eAutomations()
}

async function seedE2eWorkspace(root: string, heading: string) {
  await mkdir(root, { recursive: true })
  await writeFile(join(root, "readme.md"), `# ${heading}\nhello knowledge\n`)
  return openWorkspace(root)
}

/** ENJOY_E2E_SKIP_PROFILE=1：有项目但没有可对话路线，用来拍无密钥发送。 */
async function seedE2eProfile(): Promise<void> {
  if (process.env.ENJOY_E2E_SKIP_PROFILE === "1" || e2eChatReadyKind() === "none") return
  try {
    await upsertProfile({
      name: "E2E Stub",
      kind: "ollama",
      modelId: "stub-e2e",
      models: [{ id: "stub-e2e", label: "E2E Stub" }],
      activate: true
    })
  } catch (error) {
    console.warn("e2e stub profile skipped", error)
  }
}

async function seedE2eSessions(workspaceId: string): Promise<void> {
  const existing = await listSessions(workspaceId)
  if (existing.length > 0) return
  const count = e2eSessionCount()
  for (let i = 0; i < count; i += 1) {
    const title = i === 0 ? "New agent" : `Seed session ${String(i).padStart(2, "0")}`
    await createSession(workspaceId, title)
  }
}
