/**
 * Vendored wasm 目录：包内 assets/tree-sitter，禁止运行时下载。
 */
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const RUNTIME_WASM = "web-tree-sitter.wasm"

/** 解析 agent-core 内 vendored wasm 根目录。 */
export function treeSitterAssetsDir(override?: string): string {
  if (override) return override
  // src/context/repo-map → ../../../assets/tree-sitter
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, "../../../assets/tree-sitter"),
    join(here, "../../../../assets/tree-sitter"),
    join(process.cwd(), "packages/agent-core/assets/tree-sitter"),
    join(process.cwd(), "assets/tree-sitter")
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, RUNTIME_WASM))) return dir
  }
  return candidates[0]!
}

export function runtimeWasmPath(assetsDir?: string): string {
  return join(treeSitterAssetsDir(assetsDir), RUNTIME_WASM)
}

export function grammarWasmPath(fileName: string, assetsDir?: string): string {
  return join(treeSitterAssetsDir(assetsDir), fileName)
}
