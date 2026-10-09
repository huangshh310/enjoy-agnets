/**
 * refreshAllWorkspaces 走真实 hydrate。旧 list 晚到不得盖住刚创建的项目。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { refreshAllWorkspaces } from "./refresh-workspaces.ts"
import { useChatStore } from "../stores/chat-store.ts"

type WorkspaceRow = { id: string; name: string; rootPath: string }

function installIde(list: () => Promise<WorkspaceRow[]>) {
  const ide = {
    workspace: { list },
    session: { list: async () => [] }
  }
  ;(globalThis as { window?: { ide: typeof ide } }).window = { ide }
}

test("重叠刷新：旧名单晚到后列表里仍有刚创建的项目", async () => {
  useChatStore.setState({
    workspaceId: "ws-new",
    repositories: [],
    expandedIds: []
  })
  let releaseOld!: () => void
  const oldGate = new Promise<void>((resolve) => {
    releaseOld = resolve
  })
  let calls = 0
  installIde(async () => {
    calls += 1
    if (calls === 1) {
      await oldGate
      return [{ id: "ws-old", name: "Old", rootPath: "/old" }]
    }
    return [
      { id: "ws-new", name: "New", rootPath: "/new" },
      { id: "ws-old", name: "Old", rootPath: "/old" }
    ]
  })

  const stale = refreshAllWorkspaces()
  const fresh = refreshAllWorkspaces()
  await fresh
  releaseOld()
  await stale

  const ids = useChatStore
    .getState()
    .repositories.filter((node) => node.kind === "workspace")
    .map((node) => node.id)
  assert.ok(ids.includes("ws-new"), `expected ws-new in ${ids.join(",")}`)
  assert.ok(ids.includes("ws-old"), `expected ws-old in ${ids.join(",")}`)
})
