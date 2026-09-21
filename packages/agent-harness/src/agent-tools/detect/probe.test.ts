import assert from "node:assert/strict"
import { test } from "node:test"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import { pathDirs, probeBinaries } from "./probe.ts"
import { detectStatusFor } from "./status.ts"
import { agentToolPreset } from "../presets.ts"

test("探测按候选名命中假 PATH", async () => {
  const result = await probeBinaries(["agent", "cursor-agent"], [], async (name) =>
    name === "cursor-agent" ? "/opt/cursor-agent" : undefined
  )
  assert.deepEqual(result, { found: true, path: "/opt/cursor-agent", version: null })
})

test("找不到候选即为 missing", async () => {
  const result = await probeBinaries(["agent"], [], async () => undefined)
  assert.equal(result.found, false)
})

test("状态：Enjoy 本地恒 ready，OMP 可 spawn，未找到为 missing", () => {
  assert.equal(detectStatusFor(agentToolPreset("enjoy-local")!, { found: true, path: null, version: null }), "ready")
  assert.equal(detectStatusFor(agentToolPreset("omp")!, { found: false, path: null, version: null }), "missing")
  assert.equal(detectStatusFor(agentToolPreset("omp")!, { found: true, path: "/bin/omp", version: "1" }), "ready")
  assert.equal(detectStatusFor(agentToolPreset("cursor")!, { found: false, path: null, version: null }), "missing")
  assert.equal(detectStatusFor(agentToolPreset("cursor")!, { found: true, path: "/bin/agent", version: "1" }), "ready")
  assert.equal(detectStatusFor(agentToolPreset("gemini")!, { found: true, path: "/bin/gemini", version: "1" }), "ready")
  assert.equal(
    detectStatusFor(agentToolPreset("antigravity")!, { found: true, path: "/opt/agy", version: "1" }),
    "ready"
  )
})

test("系统 PATH 排在用户可写目录前面", () => {
  const dirs = pathDirs()
  const pathFirst = (process.env.PATH ?? "").split(delimiter).find(Boolean)
  const userBin = join(homedir(), ".local", "bin")
  if (!pathFirst || process.platform === "win32") return
  const pathIndex = dirs.indexOf(pathFirst)
  const userIndex = dirs.indexOf(userBin)
  assert.ok(pathIndex >= 0)
  if (userIndex >= 0) assert.ok(pathIndex < userIndex)
})

test("Linux 补 linuxbrew；Windows 补 nodejs 与 Roaming npm", () => {
  const dirs = pathDirs()
  if (process.platform === "win32") {
    assert.ok(dirs.some((dir) => /nodejs$/i.test(dir) || /Roaming[/\\]npm$/i.test(dir)))
    return
  }
  assert.ok(dirs.includes("/home/linuxbrew/.linuxbrew/bin"))
})

test("补上 Grok 官方安装目录，且排在系统 PATH 后面", () => {
  const dirs = pathDirs()
  const grokBin = join(homedir(), ".grok", "bin")
  assert.ok(dirs.includes(grokBin))
  const pathFirst = (process.env.PATH ?? "").split(delimiter).find(Boolean)
  if (!pathFirst || process.platform === "win32") return
  assert.ok(dirs.indexOf(pathFirst) < dirs.indexOf(grokBin))
})

test("补上 Factory Droid 官方安装目录，且排在系统 PATH 后面", () => {
  const dirs = pathDirs()
  const factoryBin = join(homedir(), ".factory", "bin")
  assert.ok(dirs.includes(factoryBin))
  const pathFirst = (process.env.PATH ?? "").split(delimiter).find(Boolean)
  if (!pathFirst || process.platform === "win32") return
  assert.ok(dirs.indexOf(pathFirst) < dirs.indexOf(factoryBin))
})
