/**
 * 顶层 / export 符号一行签名（不做全文、不做 LSP）。
 */
import type { GrammarId } from "./languages.ts"
import { REPO_MAP_SIGNATURE_MAX_CHARS } from "./budgets.ts"
import type { TreeSitterNode } from "./wasm-host.ts"
import { parseSource, type WasmHostOptions } from "./wasm-host.ts"

const TS_LIKE_DECL = new Set([
  "function_declaration",
  "class_declaration",
  "abstract_class_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
  "lexical_declaration",
  "generator_function_declaration"
])

const PYTHON_DECL = new Set(["function_definition", "class_definition", "decorated_definition"])
const GO_DECL = new Set(["function_declaration", "method_declaration", "type_declaration"])
const RUST_DECL = new Set([
  "function_item",
  "struct_item",
  "enum_item",
  "trait_item",
  "type_item",
  "const_item",
  "static_item",
  "impl_item"
])

export async function extractSignatures(
  source: string,
  grammarId: GrammarId,
  options?: WasmHostOptions
): Promise<string[] | null> {
  const root = await parseSource(source, grammarId, options)
  if (!root) return null
  switch (grammarId) {
    case "typescript":
    case "tsx":
    case "javascript":
      return collectTsLike(source, root, grammarId === "javascript")
    case "python":
      return collectByTypes(source, root, PYTHON_DECL, peelPythonDecorated)
    case "go":
      return collectByTypes(source, root, GO_DECL)
    case "rust":
      return collectByTypes(source, root, RUST_DECL)
    default:
      return []
  }
}

function collectTsLike(source: string, root: TreeSitterNode, jsOnly: boolean): string[] {
  const out: string[] = []
  for (const child of root.namedChildren) {
    if (child.type === "export_statement") {
      for (const inner of child.namedChildren) {
        if (isTsDecl(inner.type, jsOnly)) out.push(signatureLine(source, preferExportLine(source, child, inner)))
      }
      // export default function/class 等可能直接挂在 export_statement
      if (child.namedChildren.every((n) => !isTsDecl(n.type, jsOnly))) {
        const line = signatureLine(source, child)
        if (line.startsWith("export")) out.push(line)
      }
      continue
    }
    if (isTsDecl(child.type, jsOnly)) out.push(signatureLine(source, child))
  }
  return unique(out.filter(Boolean))
}

function isTsDecl(type: string, jsOnly: boolean): boolean {
  if (!TS_LIKE_DECL.has(type)) return false
  if (jsOnly && (type === "interface_declaration" || type === "type_alias_declaration" || type === "enum_declaration" || type === "abstract_class_declaration")) {
    return false
  }
  return true
}

function preferExportLine(source: string, exportNode: TreeSitterNode, inner: TreeSitterNode): TreeSitterNode {
  // 取 export 节点以保留 `export` 前缀；签名仍截首行。
  return exportNode.startIndex <= inner.startIndex ? exportNode : inner
}

function collectByTypes(
  source: string,
  root: TreeSitterNode,
  types: Set<string>,
  mapNode?: (node: TreeSitterNode) => TreeSitterNode
): string[] {
  const out: string[] = []
  for (const child of root.namedChildren) {
    if (!types.has(child.type)) continue
    const target = mapNode ? mapNode(child) : child
    out.push(signatureLine(source, target))
  }
  return unique(out.filter(Boolean))
}

function peelPythonDecorated(node: TreeSitterNode): TreeSitterNode {
  if (node.type !== "decorated_definition") return node
  for (const child of node.namedChildren) {
    if (child.type === "function_definition" || child.type === "class_definition") return child
  }
  return node
}

function signatureLine(source: string, node: TreeSitterNode): string {
  const raw = source.slice(node.startIndex, node.endIndex)
  const first = (raw.split(/\r?\n/)[0] ?? "").trimEnd()
  const brace = first.indexOf("{")
  const cut = brace >= 0 ? first.slice(0, brace + 1) : first
  if (cut.length <= REPO_MAP_SIGNATURE_MAX_CHARS) return cut.trim()
  return `${cut.slice(0, REPO_MAP_SIGNATURE_MAX_CHARS).trim()}…`
}

function unique(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    if (seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}
