/**
 * refreshWorkspacesInto 走真实灌入路径。旧 list 晚到不得盖住刚创建的项目。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { refreshWorkspacesInto, resetRefreshWorkspacesForTest } from "./refresh-workspaces.ts"

type WorkspaceRow = { id: string; name: string; rootPath: string }

function installIde(list: () => Promise<WorkspaceRow[]>) {
  const ide = {
    workspace: { list },
    session: { list: async () => [] }
  }
  ;(globalThis as { window?: { ide: typeof ide } }).window = { ide }
}

test("重叠刷新：旧名单晚到后列表里仍有刚创建的项目", async () => {
  resetRefreshWorkspacesForTest()
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

  let ids: string[] = []
  const sink = {
    activeWorkspaceId: () => "ws-new",
    hydrate: (items: Array<{ workspace: { id: string } }>) => {
      ids = items.map((item) => item.workspace.id)
    }
  }
  const stale = refreshWorkspacesInto(sink)
  const fresh = refreshWorkspacesInto(sink)
  await fresh
  releaseOld()
  await stale

  assert.ok(ids.includes("ws-new"), `expected ws-new in ${ids.join(",")}`)
  assert.ok(ids.includes("ws-old"), `expected ws-old in ${ids.join(",")}`)
})

test("最新一次刷新失败时仍灌入最近一次成功的名单", async () => {
  resetRefreshWorkspacesForTest()
  let releaseOld!: () => void
  const oldGate = new Promise<void>((resolve) => {
    releaseOld = resolve
  })
  let calls = 0
  installIde(async () => {
    calls += 1
    if (calls === 1) {
      await oldGate
      return [{ id: "ws-ok", name: "Ok", rootPath: "/ok" }]
    }
    throw new Error("latest list failed")
  })

  let ids: string[] = []
  const sink = {
    activeWorkspaceId: () => "ws-ok",
    hydrate: (items: Array<{ workspace: { id: string } }>) => {
      ids = items.map((item) => item.workspace.id)
    }
  }
  const staleSuccess = refreshWorkspacesInto(sink)
  const latestFail = refreshWorkspacesInto(sink)
  await latestFail
  releaseOld()
  await staleSuccess

  assert.deepEqual(ids, ["ws-ok"])
})
