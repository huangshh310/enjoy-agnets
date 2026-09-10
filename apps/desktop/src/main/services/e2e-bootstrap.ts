/**
 * E2E 启动：隔离 userData 后写入工作区、Ollama 档案（无需 Key）、默认模型与会话。
 */
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { setSetting } from "./database"
import { isE2eStub } from "./e2e-stub"
import { createSession } from "./session-queries"
import { upsertProfile } from "./secrets"
import { openWorkspace } from "./workspace"
import { addKnowledgeSource, indexKnowledgeSource } from "./knowledge-service"

export async function bootstrapE2eStub(): Promise<void> {
  if (!isE2eStub()) return
  const root = process.env.ENJOY_E2E_WORKSPACE
  if (!root) return
  await mkdir(root, { recursive: true })
  await writeFile(join(root, "readme.md"), "# e2e workspace\nhello knowledge\n")
  const workspace = await openWorkspace(root)
  setSetting("lastWorkspaceId", workspace.id)
  setSetting("defaultModelId", "stub-e2e")
  await upsertProfile({
    name: "E2E Stub",
    kind: "ollama",
    modelId: "stub-e2e",
    models: [{ id: "stub-e2e", label: "E2E Stub" }],
    activate: true
  })
  await createSession(workspace.id, "New agent")
  const source = await addKnowledgeSource(workspace.id, ".")
  await indexKnowledgeSource(source.id, true)
}
