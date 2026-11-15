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
  runExecutableTree,
  TREE_KILL_SLA_MS
} from "./command.ts"
import { shouldUseOsSandbox, seatbeltWrap, buildSeatbeltProfile } from "./os-sandbox.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const posix = process.platform !== "win32"

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
  assert.equal(result.processExit === "killed" || result.processExit === "unconfirmed", true)
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
  assert.ok(result.processExit === "killed" || result.processExit === "unconfirmed" || result.exitCode !== 0)
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
