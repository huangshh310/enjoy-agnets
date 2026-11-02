/**
 * 按语言高亮源码。用 css-variables 主题，颜色走 BoardUI token，不跟彩虹皮肤。
 * 右栏文件预览与气泡 MarkdownFence 共用；结果带轻量缓存，流式更新时保留上一帧防闪。
 *
 * Shiki 4：createCssVariablesTheme + JS regex 引擎（Electron CSP 无 wasm-unsafe-eval，
 * 不能 instantiate oniguruma WASM）。
 */
import { useEffect, useState } from "react"
import {
  createCssVariablesTheme,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
  type ShikiTransformer,
  type SpecialLanguage
} from "shiki"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"
import type { SyntaxLanguage } from "./language"

const cssVariablesTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
  fontStyle: true
})

/** 启动时预载常用语言；其余按需 loadLanguage。 */
const BOOT_LANGS: BundledLanguage[] = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "json",
  "jsonc",
  "bash",
  "go",
  "rust",
  "markdown",
  "yaml",
  "html",
  "css"
]

/** plaintext 属 SpecialLanguage，不在 BundledLanguage 里。 */
const BOOT_SPECIAL_LANGS: SpecialLanguage[] = ["plaintext"]

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [cssVariablesTheme],
      langs: [...BOOT_LANGS, ...BOOT_SPECIAL_LANGS],
      engine: createJavaScriptRegexEngine()
    })
  }
  return highlighterPromise
}

function lineNumberTransformer(variant: "pane" | "fence"): ShikiTransformer {
  const gutterClass =
    variant === "fence"
      ? [
          "inline-block",
          "w-4",
          "mr-4",
          "shrink-0",
          "select-none",
          "text-right",
          "tabular-nums",
          "text-background/40"
        ]
      : [
          "inline-block",
          "w-5",
          "mr-3",
          "shrink-0",
          "select-none",
          "text-right",
          "tabular-nums",
          "text-caption-1-medium",
          "text-text-tertiary"
        ]
  return {
    name: `line-numbers-${variant}`,
    line(node, line) {
      if (variant === "pane") {
        node.properties = { ...node.properties, "data-source-line": String(line) }
      }
      node.children.unshift({
        type: "element",
        tagName: "span",
        properties: { className: gutterClass },
        children: [{ type: "text", value: String(line) }]
      })
    }
  }
}

/** 关键字紫、字符串苔绿、注释三级灰，其余压到次要色。（右栏 / 浅底） */
export const SHIKI_TOKEN_VARS = [
  "[--shiki-foreground:var(--color-text-primary)]",
  "[--shiki-background:transparent]",
  "[--shiki-token-keyword:var(--color-docs-command-accent)]",
  "[--shiki-token-string:var(--color-state-success-text)]",
  "[--shiki-token-string-expression:var(--color-state-success-text)]",
  "[--shiki-token-comment:var(--color-text-tertiary)]",
  "[--shiki-token-constant:var(--color-text-secondary)]",
  "[--shiki-token-function:var(--color-text-secondary)]",
  "[--shiki-token-parameter:var(--color-text-secondary)]",
  "[--shiki-token-punctuation:var(--color-text-tertiary)]",
  "[--shiki-token-link:var(--color-accent-500)]"
].join(" ")

/**
 * 气泡代码卡是 dark inverted（bg-neutral-925 / text-background）。
 * 文本走 background（浅色），注释半透明浅色；关键字/字符串仍用语义色。
 */
export const SHIKI_FENCE_TOKEN_VARS = [
  "[--shiki-foreground:var(--color-background)]",
  "[--shiki-background:transparent]",
  "[--shiki-token-keyword:var(--color-docs-command-accent)]",
  "[--shiki-token-string:var(--color-state-success-text)]",
  "[--shiki-token-string-expression:var(--color-state-success-text)]",
  "[--shiki-token-comment:color-mix(in oklab,var(--color-background)_42%,transparent)]",
  "[--shiki-token-constant:color-mix(in oklab,var(--color-background)_78%,transparent)]",
  "[--shiki-token-function:color-mix(in oklab,var(--color-background)_86%,transparent)]",
  "[--shiki-token-parameter:color-mix(in oklab,var(--color-background)_78%,transparent)]",
  "[--shiki-token-punctuation:color-mix(in oklab,var(--color-background)_55%,transparent)]",
  "[--shiki-token-link:var(--color-accent-500)]"
].join(" ")

export type ShikiHighlightOptions = {
  /**
   * 行号：
   * - `pane`（默认）右栏预览，带 data-source-line
   * - `fence` 气泡深色卡 gutter
   * - `false` 不要行号（Run 行）
   */
  lineNumbers?: "pane" | "fence" | false
}

const htmlCache = new Map<string, string>()
const CACHE_MAX = 64

function cacheKey(
  code: string,
  language: SyntaxLanguage,
  lineNumbers: ShikiHighlightOptions["lineNumbers"]
) {
  const mode = lineNumbers === false ? "0" : lineNumbers === "fence" ? "f" : "p"
  return `${mode}:${language}:${code}`
}

function remember(key: string, html: string) {
  if (htmlCache.has(key)) htmlCache.delete(key)
  htmlCache.set(key, html)
  while (htmlCache.size > CACHE_MAX) {
    const oldest = htmlCache.keys().next().value
    if (oldest == null) break
    htmlCache.delete(oldest)
  }
}

/** 供右栏 / 围栏共用；命中缓存同步返回。 */
export async function highlightToHtml(
  code: string,
  language: SyntaxLanguage,
  options: ShikiHighlightOptions = {}
): Promise<string> {
  const lineNumbers = options.lineNumbers === undefined ? "pane" : options.lineNumbers
  const key = cacheKey(code, language, lineNumbers)
  const hit = htmlCache.get(key)
  if (hit != null) return hit
  const html = await highlightOne(code, language, lineNumbers)
  remember(key, html)
  return html
}

export function useShikiHtml(
  code: string,
  language: SyntaxLanguage,
  options: ShikiHighlightOptions = {}
) {
  const lineNumbers = options.lineNumbers === undefined ? "pane" : options.lineNumbers
  const key = cacheKey(code, language, lineNumbers)
  const cached = htmlCache.get(key) ?? ""
  const [html, setHtml] = useState(cached)

  useEffect(() => {
    let cancelled = false
    const hit = htmlCache.get(key)
    if (hit != null) {
      setHtml(hit)
      return () => {
        cancelled = true
      }
    }
    // 不立刻清空：保留上一帧，流式加长代码时避免闪回纯文本
    void highlightToHtml(code, language, { lineNumbers }).then((next) => {
      if (!cancelled) setHtml(next)
    })
    return () => {
      cancelled = true
    }
  }, [code, language, lineNumbers, key])

  return html
}

async function highlightOne(
  code: string,
  language: SyntaxLanguage,
  lineNumbers: ShikiHighlightOptions["lineNumbers"]
) {
  const source = code.length > 0 ? code : " "
  const transformers: ShikiTransformer[] =
    lineNumbers === false ? [] : [lineNumberTransformer(lineNumbers ?? "pane")]
  const highlighter = await getHighlighter()
  const lang = await ensureLang(highlighter, language)
  return highlighter.codeToHtml(source, {
    lang,
    theme: "css-variables",
    transformers
  })
}

async function ensureLang(
  highlighter: Highlighter,
  language: SyntaxLanguage
): Promise<BundledLanguage | SpecialLanguage> {
  const loaded = highlighter.getLoadedLanguages()
  if (loaded.includes(language)) return language as BundledLanguage | SpecialLanguage
  try {
    await highlighter.loadLanguage(language as BundledLanguage)
    return language as BundledLanguage
  } catch {
    if (!loaded.includes("plaintext")) {
      await highlighter.loadLanguage("plaintext")
    }
    return "plaintext"
  }
}
