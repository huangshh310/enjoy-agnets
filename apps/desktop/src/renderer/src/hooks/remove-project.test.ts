/**
 * 假 IDE + 真实历史栈驱动 runRemoveProject：覆盖断开顺序、删空/切换、路由回落。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { DEFAULT_HISTORY_ID } from "./nav-history/constants.ts"
import { pruneHistory } from "./nav-history/nav-history.ts"
import { historyIdsForProject, historySessionId } from "./nav-history/page-ids.ts"
import type { HistoryEntry, HistoryStack } from "./nav-history/nav-history.types.ts"
import { runRemoveProject, type RemoveProjectIo } from "./remove-project.ts"
import { peekWorkspacePointer, seedWorkspacePointer } from "./workspace-pointer.ts"
import type { WorkspaceRow } from "./workspace-row.ts"

const sshCurrent: WorkspaceRow = {
  id: "ws-ssh",
  name: "Remote",
  rootPath: "alice@example.com:/app",
  kind: "ssh"
}
const leftover: WorkspaceRow = {
  id: "ws-keep",
  name: "Keep",
  rootPath: "/tmp/keep",
  kind: "local"
}
const otherSsh: WorkspaceRow = {
  id: "ws-other-ssh",
  name: "OtherRemote",
  rootPath: "bob@example.com:/srv",
  kind: "ssh"
}

function sessionPage(workspaceId: string, sessionId: string): HistoryEntry {
  return {
    id: historySessionId(sessionId),
    title: sessionId,
    params: { kind: "session", to: "/", sessionId, workspaceId }
  }
}

function settingsPage(): HistoryEntry {
  return {
    id: "route:settings",
    title: "设置",
    params: { kind: "route", to: "/settings/workspace" }
  }
}

function seededStack(current: HistoryEntry, past: HistoryEntry[] = []): HistoryStack {
  return {
    past,
    current,
    future: [],
    seeded: true,
    lastPushAt: null,
    lastAction: "push"
  }
}

function resetPointer(workspace: WorkspaceRow | null, repositories: WorkspaceRow[]) {
  seedWorkspacePointer({ workspace, repositories })
}

function fakeRemoveIo(input: {
  workspaces: WorkspaceRow[]
  stack: HistoryStack
  lastWorkspaceId: string | null
  createdSessions: string[]
  disconnected: string[]
  connected: string[]
  landedHome: string[]
  switched: string[]
  order: string[]
}): RemoveProjectIo & { stack: HistoryStack } {
  let workspaces = [...input.workspaces]
  const io: RemoveProjectIo & { stack: HistoryStack } = {
    stack: input.stack,
    currentWorkspaceId: () => peekWorkspacePointer().workspaceId,
    unpinIfPinned: () => undefined,
    remove: async (workspaceId) => {
      input.order.push("remove")
      input.disconnected.push(workspaceId)
      workspaces = workspaces.filter((row) => row.id !== workspaceId)
      return { id: workspaceId, lastWorkspaceId: input.lastWorkspaceId }
    },
    connectSsh: async (workspace) => {
      input.order.push("connect")
      input.connected.push(workspace.id)
    },
    landEmptyHome: async () => {
      input.order.push("home")
      input.landedHome.push("home")
    },
    notifySwitched: (workspace) => {
      input.order.push("toast")
      input.switched.push(workspace.name)
    },
    refreshWorkspaces: async () => {
      seedWorkspacePointer({ repositories: workspaces })
    },
    listWorkspaces: async () => workspaces,
    setWorkspacesCache: () => undefined,
    invalidateCaches: async () => {
      input.order.push("invalidate")
    },
    collectPageIds: async (workspaceId) => historyIdsForProject(workspaceId, [`sess-${workspaceId}`]),
    pruneHistory: (ids) => {
      input.order.push("prune")
      const fallback = {
        id: DEFAULT_HISTORY_ID,
        title: "新对话",
        params: { kind: "route" as const, to: "/" }
      }
      io.stack = pruneHistory(io.stack, new Set(ids), fallback).stack
    },
    clearForegroundChat: () => {
      input.order.push("clearChat")
    }
  }
  void input.createdSessions
  return io
}

test("删光最后一个项目时回到主区空态，不落设置页", async () => {
  resetPointer(sshCurrent, [sshCurrent])
  const disconnected: string[] = []
  const landedHome: string[] = []
  const switched: string[] = []
  const order: string[] = []
  const io = fakeRemoveIo({
    workspaces: [sshCurrent],
    stack: seededStack(sessionPage(sshCurrent.id, `sess-${sshCurrent.id}`)),
    lastWorkspaceId: null,
    createdSessions: [],
    disconnected,
    connected: [],
    landedHome,
    switched,
    order
  })
  await runRemoveProject(sshCurrent.id, io)
  assert.deepEqual(disconnected, [sshCurrent.id])
  assert.deepEqual(landedHome, ["home"])
  assert.deepEqual(switched, [])
  assert.ok(order.includes("home"))
  assert.ok(!order.includes("toast"))
  assert.equal(peekWorkspacePointer().workspaceId, null)
})

test("删除当前 SSH 并切到别的项目时会断开", async () => {
  resetPointer(sshCurrent, [sshCurrent, leftover])
  const disconnected: string[] = []
  const createdSessions: string[] = []
  const connected: string[] = []
  const switched: string[] = []
  const order: string[] = []
  const io = fakeRemoveIo({
    workspaces: [sshCurrent, leftover],
    stack: seededStack(sessionPage(sshCurrent.id, `sess-${sshCurrent.id}`)),
    lastWorkspaceId: leftover.id,
    createdSessions,
    disconnected,
    connected,
    landedHome: [],
    switched,
    order
  })
  await runRemoveProject(sshCurrent.id, io)
  assert.deepEqual(disconnected, [sshCurrent.id])
  assert.deepEqual(connected, [])
  assert.deepEqual(switched, [leftover.name])
  assert.equal(peekWorkspacePointer().workspaceId, leftover.id)
  assert.equal(peekWorkspacePointer().workspaceName, leftover.name)
  assert.equal(createdSessions.length, 0)
})

test("删除非当前 SSH 项目也会断开", async () => {
  resetPointer(leftover, [otherSsh, leftover])
  const disconnected: string[] = []
  const createdSessions: string[] = []
  const connected: string[] = []
  const order: string[] = []
  const io = fakeRemoveIo({
    workspaces: [otherSsh, leftover],
    stack: seededStack(sessionPage(leftover.id, `sess-${leftover.id}`)),
    lastWorkspaceId: leftover.id,
    createdSessions,
    disconnected,
    connected,
    landedHome: [],
    switched: [],
    order
  })
  await runRemoveProject(otherSsh.id, io)
  assert.deepEqual(disconnected, [otherSsh.id])
  assert.equal(peekWorkspacePointer().workspaceId, leftover.id)
  assert.equal(createdSessions.length, 0)
})

test("历史里有设置页、当前在对话主区时删除当前项目，路由仍在主区并切到 MRU", async () => {
  resetPointer(sshCurrent, [sshCurrent, leftover])
  const disconnected: string[] = []
  const createdSessions: string[] = []
  const connected: string[] = []
  const switched: string[] = []
  const order: string[] = []
  const io = fakeRemoveIo({
    workspaces: [sshCurrent, leftover],
    stack: seededStack(sessionPage(sshCurrent.id, `sess-${sshCurrent.id}`), [settingsPage()]),
    lastWorkspaceId: leftover.id,
    createdSessions,
    disconnected,
    connected,
    landedHome: [],
    switched,
    order
  })
  await runRemoveProject(sshCurrent.id, io)
  assert.equal(io.stack.current.params?.to, "/")
  assert.notEqual(io.stack.current.id, "route:settings")
  assert.deepEqual(io.stack.past.map((entry) => entry.id), ["route:settings"])
  assert.equal(peekWorkspacePointer().workspaceId, leftover.id)
  assert.equal(peekWorkspacePointer().workspaceName, leftover.name)
  assert.deepEqual(switched, [leftover.name])
  assert.ok(!order.includes("home"))
  assert.equal(createdSessions.length, 0)
  assert.ok(!order.includes("createSession"))
})

test("切到剩余 SSH 项目时只建立连接，不新建会话", async () => {
  const localCurrent: WorkspaceRow = { id: "ws-local", name: "Local", rootPath: "/tmp/local" }
  resetPointer(localCurrent, [localCurrent, otherSsh])
  const disconnected: string[] = []
  const createdSessions: string[] = []
  const connected: string[] = []
  const order: string[] = []
  const io = fakeRemoveIo({
    workspaces: [localCurrent, otherSsh],
    stack: seededStack(sessionPage(localCurrent.id, `sess-${localCurrent.id}`)),
    lastWorkspaceId: otherSsh.id,
    createdSessions,
    disconnected,
    connected,
    landedHome: [],
    switched: [],
    order
  })
  await runRemoveProject(localCurrent.id, io)
  assert.deepEqual(connected, [otherSsh.id])
  assert.ok(!order.includes("createSession"))
  assert.equal(createdSessions.length, 0)
  assert.equal(peekWorkspacePointer().workspaceId, otherSsh.id)
  assert.equal(peekWorkspacePointer().sessionId, null)
})

test("lastWorkspaceId 用 main 删除返回值，不读旧 settings 缓存", async () => {
  const first: WorkspaceRow = { id: "ws-first", name: "First", rootPath: "/tmp/first" }
  resetPointer(sshCurrent, [first, leftover, sshCurrent])
  const disconnected: string[] = []
  const io = fakeRemoveIo({
    workspaces: [first, leftover, sshCurrent],
    stack: seededStack(sessionPage(sshCurrent.id, `sess-${sshCurrent.id}`)),
    lastWorkspaceId: leftover.id,
    createdSessions: [],
    disconnected,
    connected: [],
    landedHome: [],
    switched: [],
    order: []
  })
  await runRemoveProject(sshCurrent.id, io)
  assert.equal(peekWorkspacePointer().workspaceId, leftover.id)
  assert.notEqual(peekWorkspacePointer().workspaceId, first.id)
})

test("runRemoveProject 不 loadWorkspace、不静默建会话", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "remove-project.ts"), "utf8")
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /loadWorkspace|createAndOpenSession|loadSession/)
  const lifecycle = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "workspace-lifecycle.ts"),
    "utf8"
  )
  assert.doesNotMatch(lifecycle, /loadWorkspace/)
  assert.match(lifecycle, /\["settings"\]/)
  assert.match(lifecycle, /landEmptyHome/)
  assert.match(lifecycle, /pruneHistoryPages/)
  assert.match(lifecycle, /notifySwitchedProject/)
})

test("切换项目走 workspace.remember 写入 MRU；Unknown workspace 中止，其它失败不挡住", () => {
  const load = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "use-agent-session.ts"), "utf8")
  assert.match(load, /workspace\.remember/)
  assert.match(load, /isUnknownWorkspaceRememberError/)
  assert.match(load, /其它 remember 失败不得挡住切换/)
})
