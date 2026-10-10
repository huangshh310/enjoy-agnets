/**
 * E2E 启动：隔离 userData 后写入工作区、Ollama 档案（无需 Key）、默认模型与会话。
 */
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app } from "electron"
import { setSetting } from "./database"
import { isE2eStub } from "./e2e-stub"
import { createSession } from "./session-queries"
import { upsertProfile } from "./secrets"
import { openWorkspace } from "./workspace"
import { seedE2eAutomations } from "./e2e-stub-automations"
import { shouldSeedE2eLedger } from "./e2e-stub-ledger-data"
import { seedE2eLedgerSession } from "./e2e-stub-ledger"
import { addKnowledgeSource, indexKnowledgeSource } from "./knowledge-service"
import { e2eSessionCount } from "./e2e-session-count"

export async function bootstrapE2eStub(): Promise<void> {
  if (!isE2eStub(app.isPackaged)) return
  const root = process.env.ENJOY_E2E_WORKSPACE
  if (!root) return
  await mkdir(root, { recursive: true })
  await writeFile(join(root, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const workspace = await openWorkspace(root)
  setSetting("lastWorkspaceId", workspace.id)
  setSetting("defaultModelId", "stub-e2e")
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
  await seedE2eSessions(workspace.id)
  if (shouldSeedE2eLedger()) await seedE2eLedgerSession(workspace.id)
  seedE2eAutomations()
  const source = await addKnowledgeSource(workspace.id, ".")
  await indexKnowledgeSource(source.id, true)
}

async function seedE2eSessions(workspaceId: string): Promise<void> {
  const count = e2eSessionCount()
  for (let i = 0; i < count; i += 1) {
    const title = i === 0 ? "New agent" : `Seed session ${String(i).padStart(2, "0")}`
    await createSession(workspaceId, title)
  }
}

