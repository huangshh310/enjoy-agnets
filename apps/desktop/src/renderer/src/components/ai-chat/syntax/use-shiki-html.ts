/**
 * 按语言高亮源码。用 css-variables 主题，颜色走 BoardUI token，不跟彩虹皮肤。
 */
import { useEffect, useState } from "react"
import { codeToHtml, type BundledLanguage, type ShikiTransformer } from "shiki"
import type { SyntaxLanguage } from "./language"

const lineNumbers: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.properties = { ...node.properties, "data-source-line": String(line) }
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
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
      },
      children: [{ type: "text", value: String(line) }]
    })
  }
}

/** 关键字紫、字符串苔绿、注释三级灰，其余压到次要色。 */
export const SHIKI_TOKEN_VARS = [
  "[--shiki-color-text:var(--color-text-primary)]",
  "[--shiki-color-background:transparent]",
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

export function useShikiHtml(code: string, language: SyntaxLanguage) {
  const [html, setHtml] = useState("")

  useEffect(() => {
    let cancelled = false
    void highlightOne(code, language).then((next) => {
      if (!cancelled) setHtml(next)
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  return html
}

async function highlightOne(code: string, language: SyntaxLanguage) {
  const source = code.length > 0 ? code : " "
  try {
    return await codeToHtml(source, {
      lang: language as BundledLanguage,
      theme: "css-variables",
      transformers: [lineNumbers]
    })
  } catch {
    return codeToHtml(source, {
      lang: "plaintext",
      theme: "css-variables",
      transformers: [lineNumbers]
    })
  }
}
