/**
 * web-tree-sitter 宿主：init once + 按语言懒加载 grammar。
 * API：命名导出 Parser / Language；locateFile → web-tree-sitter.wasm。
 */
import { GRAMMAR_WASM_FILES, GRAMMAR_VERSION } from "./languages.ts"
import type { GrammarId } from "./languages.ts"
import { grammarWasmPath, runtimeWasmPath, treeSitterAssetsDir } from "./assets-path.ts"

export type TreeSitterLanguage = {
  // opaque; web-tree-sitter Language instance
  readonly __brand: "Language"
}

export type TreeSitterParser = {
  setLanguage(language: TreeSitterLanguage | null): void
  parse(input: string): { rootNode: TreeSitterNode; delete(): void }
  delete(): void
}

export type TreeSitterNode = {
  type: string
  startIndex: number
  endIndex: number
  namedChildren: TreeSitterNode[]
  childForFieldName?(name: string): TreeSitterNode | null
}

type WebTreeSitterModule = {
  Parser: {
    init(options?: { locateFile?: (scriptName: string, scriptDirectory: string) => string }): Promise<void>
    new (): TreeSitterParser
  }
  Language: {
    load(input: string | Uint8Array): Promise<TreeSitterLanguage>
  }
}

export type WasmHostOptions = {
  assetsDir?: string
  /** 单测：强制 init 失败，走目录降级。 */
  forceInitFailure?: boolean
  /** 注入模块（单测）。 */
  module?: WebTreeSitterModule
}

let initPromise: Promise<void> | null = null
let initFailed = false
let cachedModule: WebTreeSitterModule | null = null
const languageCache = new Map<GrammarId, TreeSitterLanguage | null>()
let sharedParser: TreeSitterParser | null = null
let activeAssetsDir: string | undefined

export function grammarVersion(): string {
  return GRAMMAR_VERSION
}

export function resetWasmHostForTests(): void {
  initPromise = null
  initFailed = false
  cachedModule = null
  languageCache.clear()
  if (sharedParser) {
    try {
      sharedParser.delete()
    } catch {
      /* ignore */
    }
  }
  sharedParser = null
  activeAssetsDir = undefined
}

export async function ensureWasmReady(options?: WasmHostOptions): Promise<boolean> {
  if (options?.forceInitFailure) {
    initFailed = true
    return false
  }
  if (initFailed) return false
  if (initPromise) {
    try {
      await initPromise
      return !initFailed
    } catch {
      return false
    }
  }
  activeAssetsDir = options?.assetsDir
  initPromise = (async () => {
    const mod = options?.module ?? (await loadWebTreeSitter())
    cachedModule = mod
    const assets = treeSitterAssetsDir(activeAssetsDir)
    const runtime = runtimeWasmPath(assets)
    await mod.Parser.init({
      locateFile(scriptName: string) {
        if (scriptName === "web-tree-sitter.wasm" || scriptName.endsWith(".wasm")) {
          return runtime
        }
        return runtime
      }
    })
  })()
  try {
    await initPromise
    return true
  } catch {
    initFailed = true
    return false
  }
}

async function loadWebTreeSitter(): Promise<WebTreeSitterModule> {
  const mod = (await import("web-tree-sitter")) as unknown as WebTreeSitterModule & {
    default?: WebTreeSitterModule
  }
  if (mod.Parser && mod.Language) return mod
  if (mod.default?.Parser && mod.default.Language) return mod.default
  throw new Error("web-tree-sitter named exports Parser/Language missing")
}

export async function loadGrammar(
  id: GrammarId,
  options?: WasmHostOptions
): Promise<TreeSitterLanguage | null> {
  if (languageCache.has(id)) return languageCache.get(id) ?? null
  const ready = await ensureWasmReady(options)
  if (!ready || !cachedModule) {
    languageCache.set(id, null)
    return null
  }
  try {
    const file = GRAMMAR_WASM_FILES[id]
    const abs = grammarWasmPath(file, options?.assetsDir ?? activeAssetsDir)
    const language = await cachedModule.Language.load(abs)
    languageCache.set(id, language)
    return language
  } catch {
    languageCache.set(id, null)
    return null
  }
}

export async function parseSource(
  source: string,
  grammarId: GrammarId,
  options?: WasmHostOptions
): Promise<TreeSitterNode | null> {
  const language = await loadGrammar(grammarId, options)
  if (!language || !cachedModule) return null
  try {
    if (!sharedParser) sharedParser = new cachedModule.Parser()
    sharedParser.setLanguage(language)
    const tree = sharedParser.parse(source)
    const root = tree.rootNode
    // 不 delete tree：部分版本 rootNode 与 tree 生命周期绑定；短命工具调用可接受。
    return root
  } catch {
    return null
  }
}
