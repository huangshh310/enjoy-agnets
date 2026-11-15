/**
 * runExecutableTree 进程树查杀（leo arch §2.4）与开放问题记录。
 * 平台相关用例用 skip 保护，三端 CI 都要能跑完。
 */
import assert from "node:assert/strict"
import { mkdtemp, rm, access } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { constants as fsConstants } from "node:fs"
import {
  forceKillTree,
  processAlive,
  processGroupAlive,
  processAliveFromSignalError,
  resetTreeLivenessForTest,
  runExecutableTree,
  setTreeClockForTest,
  setTreeLivenessPlatformForTest,
  setTreeLivenessProbeForTest,
  TREE_KILL_SLA_MS
} from "./command.ts"
import { afterEach } from "node:test"
import { shouldUseOsSandbox, seatbeltWrap, buildSeatbeltProfile } from "./os-sandbox.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const posix = process.platform !== "win32"

afterEach(() => {
  resetTreeLivenessForTest()
})


const IGNORE_TERM_CHILD = `
process.on("SIGTERM", () => {});
setTimeout(() => {
  require("node:fs").writeFileSync(process.env.MARKER, "x");
}, 2000);
setInterval(() => {}, 1000);
`

const TREE_SCRIPT = `
const { spawn } = require("node:child_process");
const child = spawn(process.execPath, ["-e", process.env.CHILD_SRC], {
  stdio: "ignore",
  env: { ...process.env }
});
process.stdout.write(String(process.pid) + " " + String(child.pid) + "\\n");
process.on("SIGTERM", () => {});
setInterval(() => {}, 1000);
`

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

test("POSIX：父+吞 SIGTERM 的孙进程在 abort 后 ≤2s 整组消失，3s 后无 marker，升级 SIGKILL", {
  skip: !posix
}, async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-tree-"))
  const marker = join(root, "marker.txt")
  const ac = new AbortController()
  const started = Date.now()
  let pids: number[] = []
  const running = runExecutableTree(root, process.execPath, ["-e", TREE_SCRIPT], {
    timeoutMs: 20_000,
    signal: ac.signal,
    extraEnv: { MARKER: marker, CHILD_SRC: IGNORE_TERM_CHILD },
    onSpawn: (pid) => {
      pids = [pid]
    }
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  ac.abort()
  const result = await running
  const elapsed = Date.now() - started
  assert.ok(elapsed <= TREE_KILL_SLA_MS + 800, `tree should die within SLA, took ${elapsed}ms`)
  assert.equal(result.processExit, "killed")
  assert.equal(result.tree, "confirmed")
  if (typeof result.pid === "number") assert.equal(processGroupAlive(result.pid), false)
  for (const pid of pids) assert.equal(processAlive(pid), false)
  await new Promise((resolve) => setTimeout(resolve, 3_000 - Math.min(Date.now() - started, 3_000)))
  assert.equal(await exists(marker), false, "marker must not appear after SIGKILL")
  await rm(root, { recursive: true, force: true })
})

test("timeoutMs=1000 时整棵树在 ≤3000ms 内结束", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-tree-to-"))
  const started = Date.now()
  const result = await runExecutableTree(root, process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    timeoutMs: 1_000
  })
  const elapsed = Date.now() - started
  assert.ok(elapsed <= 3_000, `timeout kill took ${elapsed}ms`)
  assert.equal(result.processExit, "killed")
  if (typeof result.pid === "number") {
    try {
      await forceKillTree(result.pid)
    } catch {
      // already gone
    }
  }
  await rm(root, { recursive: true, force: true })
})

test("macOS seatbelt 外壳与后代同组，abort 后整组消失", {
  skip: process.platform !== "darwin" || !shouldUseOsSandbox()
}, async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-seat-"))
  const wrapped = seatbeltWrap(
    process.execPath,
    ["-e", TREE_SCRIPT],
    buildSeatbeltProfile({ workspaceRoot: root, tmpDir: tmpdir(), allowNetwork: false })
  )
  const ac = new AbortController()
  const running = runExecutableTree(root, wrapped.executable, wrapped.args, {
    timeoutMs: 20_000,
    signal: ac.signal,
    extraEnv: { MARKER: join(root, "marker.txt"), CHILD_SRC: IGNORE_TERM_CHILD }
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  ac.abort()
  const result = await running
  assert.equal(result.tree, "confirmed")
  if (typeof result.pid === "number") assert.equal(processGroupAlive(result.pid), false)
  await rm(root, { recursive: true, force: true })
})

test("Windows：taskkill /T /F 路径标 tree=best_effort（非 win32 跳过）", {
  skip: posix
}, async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-tree-win-"))
  const ac = new AbortController()
  const running = runExecutableTree(root, process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    timeoutMs: 20_000,
    signal: ac.signal
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  ac.abort()
  const result = await running
  assert.equal(result.tree, "best_effort")
  await rm(root, { recursive: true, force: true })
})

test("abortAgent / abortGeneration 复用同一路径，rekill 不 await settle（源码钉死）", () => {
  const abort = readFileSync(join(dir, "abort-active-run.ts"), "utf8")
  assert.match(abort, /void rekill\(runId\)/)
  assert.equal(abort.includes("await rekill"), false)
  assert.equal(abort.includes("await waitSettled"), false)
  const runner = readFileSync(join(dir, "agent-runner.ts"), "utf8")
  assert.match(runner, /abortActiveRunMemory/)
  assert.equal(runner.includes("waitSettled"), false)
  const gen = readFileSync(join(dir, "ai-generation.ts"), "utf8")
  assert.match(gen, /await abortAgent/)
  assert.equal(gen.includes("waitSettled"), false)
})

class FakeClock {
  nowMs = 0
  seq = 0
  oneshots: Array<{ id: number; due: number; fn: () => void }> = []
  intervals: Array<{ id: number; due: number; fn: () => void; step: number }> = []
  now = () => this.nowMs
  setTimeout = (fn: () => void, ms?: number) => {
    const id = ++this.seq
    this.oneshots.push({ id, due: this.nowMs + (ms ?? 0), fn })
    return id as unknown as ReturnType<typeof setTimeout>
  }
  setInterval = (fn: () => void, ms?: number) => {
    const id = ++this.seq
    const step = ms ?? 0
    this.intervals.push({ id, due: this.nowMs + step, fn, step })
    return id as unknown as ReturnType<typeof setInterval>
  }
  clearTimeout = (handle: ReturnType<typeof setTimeout>) => {
    const id = handle as unknown as number
    this.oneshots = this.oneshots.filter((item) => item.id !== id)
  }
  clearInterval = (handle: ReturnType<typeof setInterval>) => {
    const id = handle as unknown as number
    this.intervals = this.intervals.filter((item) => item.id !== id)
  }
  tick(ms: number) {
    const end = this.nowMs + ms
    while (true) {
      const next = [...this.oneshots, ...this.intervals].sort((a, b) => a.due - b.due)[0]
      if (!next || next.due > end) {
        this.nowMs = end
        return
      }
      this.nowMs = next.due
      const interval = this.intervals.find((item) => item.id === next.id)
      if (interval) {
        interval.due += interval.step
        interval.fn()
      } else {
        this.oneshots = this.oneshots.filter((item) => item.id !== next.id)
        next.fn()
      }
    }
  }
}

test("进入查杀后 2s 仍存活不落 unconfirmed，探活见到死亡才结束", async () => {
  const clock = new FakeClock()
  setTreeClockForTest(clock)
  let alive = true
  setTreeLivenessProbeForTest(() => alive)
  const ac = new AbortController()
  const running = runExecutableTree(tmpdir(), process.execPath, ["-e", "setInterval(()=>{}, 1000)"], {
    signal: ac.signal,
    timeoutMs: 60_000
  })
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  let done = false
  const finished = running.then((result) => {
    done = true
    return result
  })
  clock.tick(TREE_KILL_SLA_MS)
  await Promise.resolve()
  assert.equal(done, false)
  alive = false
  clock.tick(50)
  const result = await finished
  assert.equal(result.processExit, "killed")
})

test("Windows 探活遇到 EPERM 当作仍存活", () => {
  const eperm = Object.assign(new Error("EPERM"), { code: "EPERM" })
  const esrch = Object.assign(new Error("ESRCH"), { code: "ESRCH" })
  assert.equal(processAliveFromSignalError(eperm), true)
  assert.equal(processAliveFromSignalError(esrch), false)
  assert.equal(processAliveFromSignalError(new Error("other")), false)
})

test("Windows：子进程退出即判整棵树结束，即使 pid 探活仍为存活（防复用）", async () => {
  setTreeLivenessPlatformForTest("win32")
  setTreeLivenessProbeForTest(() => true)
  const root = await mkdtemp(join(tmpdir(), "enjoy-win-exit-"))
  const ac = new AbortController()
  const running = runExecutableTree(root, process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    timeoutMs: 20_000,
    signal: ac.signal
  })
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  const result = await running
  assert.equal(result.processExit, "killed")
  if (typeof result.pid === "number") {
    try {
      await forceKillTree(result.pid)
    } catch {
      // already gone
    }
  }
  await rm(root, { recursive: true, force: true })
})

test("超时路径（未点停止）到 spawn+timeoutMs+2s 仍存活则按 unconfirmed 结束", async () => {
  const clock = new FakeClock()
  setTreeClockForTest(clock)
  setTreeLivenessProbeForTest(() => true)
  const root = await mkdtemp(join(tmpdir(), "enjoy-tree-cap-"))
  const running = runExecutableTree(root, process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    timeoutMs: 5_000
  })
  await new Promise((resolve) => setTimeout(resolve, 80))
  let done = false
  const finished = running.then((result) => {
    done = true
    return result
  })
  clock.tick(5_000)
  await Promise.resolve()
  assert.equal(done, false)
  clock.tick(TREE_KILL_SLA_MS - 1)
  await Promise.resolve()
  assert.equal(done, false)
  clock.tick(1)
  const result = await finished
  assert.equal(result.processExit, "unconfirmed")
  if (typeof result.pid === "number") {
    try {
      await forceKillTree(result.pid)
    } catch {
      // already gone
    }
  }
  await rm(root, { recursive: true, force: true })
})
