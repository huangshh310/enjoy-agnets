/**
 * ④ Repo map A+B+C 验收：R1 签名+相关度 / R2 预算 / R4 降级 / R5 jail / R6 无新 StreamEvent + 占用。
 */
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { createRequire } from "node:module"
import {
  buildRepoMap,
  clearRepoMapParseCache,
  getLastRepoMapOccupancy,
  rankByRelevance,
  resetLastRepoMapOccupancyForTests,
  repoMapParseCacheSizeForTests,
  SYMBOL_MAP_UNAVAILABLE_NOTE
} from "./index.ts"
import { formatSymbolMap } from "./format-symbol-map.ts"
import { resetWasmHostForTests } from "./wasm-host.ts"
import { treeSitterAssetsDir } from "./assets-path.ts"
import { codingToolNamesFor, isReadOnlyAgentMode } from "../../tools/coding-tool-names.ts"

const require = createRequire(import.meta.url)

function fixtureHost(root: string) {
  const escaped: string[] = []
  return {
    escaped,
    listDir: async (relativePath: string) => {
      assertJail(relativePath, escaped)
      const abs = join(root, relativePath === "." ? "" : relativePath)
      const { readdirSync } = await import("node:fs")
      return readdirSync(abs, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        kind: entry.isDirectory() ? ("directory" as const) : ("file" as const)
      }))
    },
    readFile: async (relativePath: string) => {
      assertJail(relativePath, escaped)
      return readFileSync(join(root, relativePath), "utf8")
    }
  }
}

function assertJail(relativePath: string, escaped: string[]) {
  const norm = relativePath.replace(/\\/g, "/")
  if (norm.split("/").includes("..") || norm.startsWith("/") || /^[A-Za-z]:/.test(norm)) {
    escaped.push(relativePath)
    throw new Error(`Path escapes the workspace: ${relativePath}`)
  }
}

function writeTsFixture(root: string) {
  mkdirSync(join(root, "src"), { recursive: true })
  writeFileSync(join(root, "package.json"), '{"name":"fixture"}\n')
  writeFileSync(
    join(root, "src", "greet.ts"),
    `export function greet(name: string): string {\n  return "hi " + name\n}\n\nexport class Greeter {\n  hi() {}\n}\n\nexport type GreeterId = string\n\nexport interface GreeterApi {\n  hi(): void\n}\n\nexport const DEFAULT_NAME = "world"\n\nexport enum Kind {\n  A,\n  B\n}\n`
  )
  writeFileSync(join(root, "src", "plain.ts"), `function localOnly(x: number) {\n  return x\n}\n`)
}

function writeRelevanceFixture(root: string) {
  mkdirSync(join(root, "src"), { recursive: true })
  writeFileSync(join(root, "package.json"), '{"name":"rel-fixture"}\n')
  // hub：被多处引用
  writeFileSync(
    join(root, "src", "hub.ts"),
    `export function hubCore(x: number): number {\n  return x + 1\n}\n\nexport class HubService {\n  run() { return hubCore(1) }\n}\n`
  )
  // 孤文件：几乎无外部引用
  writeFileSync(
    join(root, "src", "orphan.ts"),
    `export function orphanOnly(y: string): string {\n  return y\n}\n`
  )
  // 引用 hub
  writeFileSync(
    join(root, "src", "a.ts"),
    `import { hubCore, HubService } from "./hub.ts"\nexport function useA() {\n  return hubCore(2) + new HubService().run()\n}\n`
  )
  writeFileSync(
    join(root, "src", "b.ts"),
    `import { hubCore } from "./hub.ts"\nexport const bVal = hubCore(3)\n`
  )
}

test("R1: TS fixture 输出含符号签名行", async () => {
  resetWasmHostForTests()
  resetLastRepoMapOccupancyForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r1-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  const assetsDir = treeSitterAssetsDir()
  const result = await buildRepoMap(host.listDir, host.readFile, {
    wasm: { assetsDir },
    workspaceRoot: root
  })
  assert.equal(result.mode, "symbol", `expected symbol mode, got directory.\n${result.outline}`)
  assert.match(result.outline, /export function greet/)
  assert.match(result.outline, /export class Greeter/)
  assert.match(result.outline, /export type GreeterId|export interface GreeterApi|export const DEFAULT_NAME|export enum Kind/)
  assert.ok(getLastRepoMapOccupancy()?.mode === "symbol")
})

test("R1b: 被多处引用的文件按相关度排在孤文件之前（夹具）", async () => {
  resetWasmHostForTests()
  clearRepoMapParseCache()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r1b-"))
  writeRelevanceFixture(root)
  const host = fixtureHost(root)
  const result = await buildRepoMap(host.listDir, host.readFile, {
    wasm: { assetsDir: treeSitterAssetsDir() },
    workspaceRoot: root,
    // 关掉 git/mtime 干扰，只验引用粗估
    recentChangeScores: {}
  })
  assert.equal(result.mode, "symbol", result.outline)
  const hubIdx = result.outline.indexOf("## src/hub.ts")
  const orphanIdx = result.outline.indexOf("## src/orphan.ts")
  assert.ok(hubIdx >= 0, `hub missing:\n${result.outline}`)
  assert.ok(orphanIdx >= 0, `orphan missing:\n${result.outline}`)
  assert.ok(hubIdx < orphanIdx, `hub should rank before orphan:\n${result.outline}`)
})

test("R1c: rankByRelevance 纯函数——高引用分靠前", () => {
  const ranked = rankByRelevance(
    [
      { path: "src/orphan.ts", signatures: ["export function orphanOnly(y: string): string {"] },
      { path: "src/hub.ts", signatures: ["export function hubCore(x: number): number {", "export class HubService {"] },
      { path: "src/a.ts", signatures: ["export function useA() {"] }
    ],
    {
      sourcesByPath: {
        "src/orphan.ts": "export function orphanOnly(y: string): string { return y }\n",
        "src/hub.ts": "export function hubCore(x: number): number { return x }\nexport class HubService {}\n",
        "src/a.ts": "import { hubCore, HubService } from './hub'\nexport function useA() { return hubCore(1) }\n"
      },
      recentChangeScores: {}
    }
  )
  assert.equal(ranked[0]?.path, "src/hub.ts")
  assert.ok((ranked[0]?.refScore ?? 0) > (ranked.find((f) => f.path === "src/orphan.ts")?.refScore ?? 0))
})

test("R1d: 解析缓存命中时不再调用 extract", async () => {
  resetWasmHostForTests()
  clearRepoMapParseCache()
  const root = mkdtempSync(join(tmpdir(), "repo-map-cache-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  // 固定 mtime，避免两次 build 间时钟抖动
  const now = Date.now() / 1000
  utimesSync(join(root, "src", "greet.ts"), now, now)
  utimesSync(join(root, "src", "plain.ts"), now, now)

  let extractCalls = 0
  const countingExtract = async (source: string, grammarId: Parameters<typeof import("./signatures.ts").extractSignatures>[1], wasm?: Parameters<typeof import("./signatures.ts").extractSignatures>[2]) => {
    extractCalls += 1
    const { extractSignatures } = await import("./signatures.ts")
    return extractSignatures(source, grammarId, wasm)
  }

  const opts = {
    wasm: { assetsDir: treeSitterAssetsDir() },
    workspaceRoot: root,
    extractSignaturesFn: countingExtract,
    recentChangeScores: {}
  }
  const first = await buildRepoMap(host.listDir, host.readFile, opts)
  assert.equal(first.mode, "symbol")
  const firstCalls = extractCalls
  assert.ok(firstCalls >= 1)
  assert.ok(repoMapParseCacheSizeForTests() >= 1)

  extractCalls = 0
  const second = await buildRepoMap(host.listDir, host.readFile, opts)
  assert.equal(second.mode, "symbol")
  assert.equal(extractCalls, 0, "cache hit should skip extractSignatures")
  assert.match(second.outline, /export function greet/)
})

test("R2: 超预算截断并注明 omitted", () => {
  const files = Array.from({ length: 40 }, (_, i) => ({
    path: `src/file-${i}.ts`,
    signatures: [
      `export function longName${i}(arg: string): string {`,
      `export class Thing${i} {`,
      `export type Id${i} = string`
    ]
  }))
  const formatted = formatSymbolMap(files, { tokenBudget: 50 })
  assert.match(formatted.text, /omitted/)
  assert.ok(formatted.omittedFiles > 0 || formatted.omittedSignatures > 0)
  assert.ok(formatted.text.length <= formatted.charBudget + 120) // trailer may exceed slightly
})

test("R4: wasm 强制失败 → 目录模式 + 诚实文案", async () => {
  resetWasmHostForTests()
  resetLastRepoMapOccupancyForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r4-wasm-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  const result = await buildRepoMap(host.listDir, host.readFile, {
    wasm: { forceInitFailure: true }
  })
  assert.equal(result.mode, "directory")
  assert.match(result.outline, new RegExp(SYMBOL_MAP_UNAVAILABLE_NOTE))
  assert.match(result.outline, /Workspace outline|directory mode/)
  assert.equal(getLastRepoMapOccupancy()?.note, SYMBOL_MAP_UNAVAILABLE_NOTE)
})

test("R4: remote flag → 目录模式 + 诚实文案", async () => {
  resetWasmHostForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r4-remote-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  const result = await buildRepoMap(host.listDir, host.readFile, {
    forceDirectoryMode: true
  })
  assert.equal(result.mode, "directory")
  assert.match(result.outline, new RegExp(SYMBOL_MAP_UNAVAILABLE_NOTE))
})

test("R5: 路径 jail——越狱相对路径经 host 拒绝，不整仓假装成功", async () => {
  resetWasmHostForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r5-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  await assert.rejects(() => host.readFile("../secret.ts"), /escapes/)
  await assert.rejects(() => host.listDir("../"), /escapes/)
  // 正常构建仍只走 jail 内路径
  const result = await buildRepoMap(host.listDir, host.readFile, {
    forceDirectoryMode: true
  })
  assert.equal(host.escaped.length, 2)
  assert.equal(result.mode, "directory")
  assert.ok(!result.outline.includes("secret"))
})

test("R3: Explore/ask 仍注册只读 repo_outline（无 write/bash）", () => {
  assert.equal(isReadOnlyAgentMode("ask"), true)
  const names = codingToolNamesFor("ask")
  assert.ok(names.includes("repo_outline"))
  assert.ok(!names.includes("write_file"))
  assert.ok(!names.includes("bash"))
})

test("R6: StreamEvent schema 未新增 type（字面量集合保持）", () => {
  const streamEventPath = require.resolve("@enjoy-agents/ipc-contract/stream-event")
  const source = readFileSync(streamEventPath, "utf8")
  const literals = [...source.matchAll(/type:\s*z\.literal\("([^"]+)"\)/g)].map((m) => m[1])
  assert.ok(literals.includes("run.start"))
  assert.ok(literals.includes("tool.result"))
  assert.ok(!literals.includes("repo_map.occupancy"))
  assert.ok(!literals.includes("symbol.map"))
  assert.equal(literals.length, 33)
})

test("R6b: getLastRepoMapOccupancy 在 symbol/directory 后可读", async () => {
  resetWasmHostForTests()
  resetLastRepoMapOccupancyForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-r6b-"))
  writeTsFixture(root)
  const host = fixtureHost(root)
  await buildRepoMap(host.listDir, host.readFile, {
    forceDirectoryMode: true
  })
  const occ = getLastRepoMapOccupancy()
  assert.ok(occ)
  assert.equal(occ.mode, "directory")
  assert.ok(occ.approxTokens >= 0)
  assert.ok(occ.tokenBudget > 0)
  assert.equal(occ.note, SYMBOL_MAP_UNAVAILABLE_NOTE)
})

test("单文件 grammar miss 不拖垮整次 repo_outline", async () => {
  resetWasmHostForTests()
  const root = mkdtempSync(join(tmpdir(), "repo-map-miss-"))
  writeTsFixture(root)
  writeFileSync(join(root, "src", "notes.md"), "# hi\n")
  writeFileSync(join(root, "src", "unknown.zzz"), "not a grammar\n")
  const host = fixtureHost(root)
  // unknown.zzz 不会进 sourceFiles；故意读一个坏 ts 内容也不应抛
  writeFileSync(join(root, "src", "broken.ts"), "")
  const result = await buildRepoMap(host.listDir, host.readFile, {
    wasm: { assetsDir: treeSitterAssetsDir() },
    workspaceRoot: root
  })
  assert.ok(result.outline.length > 0)
  assert.ok(result.mode === "symbol" || result.mode === "directory")
})
