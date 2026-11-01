/**
 * 扩展名 → grammar 懒加载键（与 vendored wasm 文件名对齐）。
 */
export const GRAMMAR_VERSION = "repomix-0.1.16"

export type GrammarId = "typescript" | "tsx" | "javascript" | "python" | "go" | "rust"

export const GRAMMAR_WASM_FILES: Record<GrammarId, string> = {
  typescript: "tree-sitter-typescript.wasm",
  tsx: "tree-sitter-tsx.wasm",
  javascript: "tree-sitter-javascript.wasm",
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm"
}

const EXT_TO_GRAMMAR: Record<string, GrammarId> = {
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust"
}

export function grammarForPath(relativePath: string): GrammarId | null {
  const base = relativePath.replace(/\\/g, "/")
  const dot = base.lastIndexOf(".")
  if (dot < 0) return null
  const ext = base.slice(dot).toLowerCase()
  return EXT_TO_GRAMMAR[ext] ?? null
}

export function isSourcePath(relativePath: string): boolean {
  return grammarForPath(relativePath) !== null
}
