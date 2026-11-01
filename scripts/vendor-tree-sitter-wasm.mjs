#!/usr/bin/env node
/**
 * 把 web-tree-sitter runtime + 首批 grammar wasm 拷进
 * packages/agent-core/assets/tree-sitter（禁止运行时下载）。
 */
import { copyFileSync, existsSync, mkdirSync, realpathSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const agentCore = join(repoRoot, "packages/agent-core")
const outDir = join(agentCore, "assets/tree-sitter")
mkdirSync(outDir, { recursive: true })

function resolveInstalled(name) {
  const parts = name.startsWith("@") ? name.split("/") : [name]
  const linked = join(agentCore, "node_modules", ...parts)
  const hoisted = join(repoRoot, "node_modules", ...parts)
  for (const candidate of [linked, hoisted]) {
    if (existsSync(candidate)) return realpathSync(candidate)
  }
  return null
}

const wtsRoot = resolveInstalled("web-tree-sitter")
const grammarRoot = resolveInstalled("@repomix/tree-sitter-wasms")
if (!wtsRoot || !grammarRoot) {
  console.error(
    "[vendor-tree-sitter-wasm] missing deps:",
    !wtsRoot ? "web-tree-sitter" : "",
    !grammarRoot ? "@repomix/tree-sitter-wasms" : ""
  )
  process.exit(0)
}

const mapping = [
  ["web-tree-sitter.wasm", join(wtsRoot, "web-tree-sitter.wasm")],
  ["tree-sitter-typescript.wasm", join(grammarRoot, "out", "tree-sitter-typescript.wasm")],
  ["tree-sitter-tsx.wasm", join(grammarRoot, "out", "tree-sitter-tsx.wasm")],
  ["tree-sitter-javascript.wasm", join(grammarRoot, "out", "tree-sitter-javascript.wasm")],
  ["tree-sitter-python.wasm", join(grammarRoot, "out", "tree-sitter-python.wasm")],
  ["tree-sitter-go.wasm", join(grammarRoot, "out", "tree-sitter-go.wasm")],
  ["tree-sitter-rust.wasm", join(grammarRoot, "out", "tree-sitter-rust.wasm")]
]

for (const [name, src] of mapping) {
  if (!existsSync(src)) {
    console.error(`[vendor-tree-sitter-wasm] missing file: ${src}`)
    process.exit(1)
  }
  copyFileSync(src, join(outDir, name))
  console.log(`[vendor-tree-sitter-wasm] ${name}`)
}
console.log(`[vendor-tree-sitter-wasm] -> ${outDir}`)
