/**
 * 打开文件的只读预览：按扩展名高亮，行号跟主题色。
 */
import { useEffect, useRef } from "react"
import { cx } from "@/utils/cx"
import { useSourceFileReveal } from "./thread/sources/source-file-reveal"
import { languageFromPath } from "./syntax/language"
import { SHIKI_TOKEN_VARS, useShikiHtml } from "./syntax/use-shiki-html"
import { highlightLine } from "./ai-chat-syntax"

const PRE_CLASS =
  "[&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:p-0 [&>pre]:font-mono [&>pre]:text-body-2-regular [&_code]:font-mono"

export function AiChatCodePane({
  path,
  value
}: {
  path: string
  value: string
}) {
  const language = languageFromPath(path)
  const html = useShikiHtml(value, language)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const reveal = useSourceFileReveal((state) => state.reveal)

  useEffect(() => {
    if (!reveal || reveal.path !== path) return
    const root = scrollerRef.current
    if (!root) return
    for (const node of root.querySelectorAll("[data-source-highlight]")) {
      node.removeAttribute("data-source-highlight")
      node.classList.remove("bg-accent-500/10")
    }
    const from = reveal.line
    const to = reveal.line + 2
    for (let line = from; line <= to; line += 1) {
      const target = root.querySelector(`[data-source-line="${line}"]`)
      if (!(target instanceof HTMLElement)) continue
      target.setAttribute("data-source-highlight", "true")
      target.classList.add("bg-accent-500/10")
    }
    root.querySelector(`[data-source-line="${from}"]`)?.scrollIntoView({ block: "center" })
  }, [html, path, reveal, value])

  return (
    <div
      ref={scrollerRef}
      data-testid="source-file-preview"
      data-path={path}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:thin]"
    >
      {html ? (
        <div
          className={cx(PRE_CLASS, SHIKI_TOKEN_VARS)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <PlainLines path={path} value={value} />
      )}
    </div>
  )
}

function PlainLines({ path, value }: { path: string; value: string }) {
  const lines = value.length > 0 ? value.split("\n") : [" "]
  return (
    <pre className="font-mono text-body-2-regular text-text-primary">
      {lines.map((line, index) => (
        <div key={`${path}-${index}`} data-source-line={index + 1} className="flex gap-3">
          <span className="w-5 shrink-0 text-right tabular-nums text-caption-1-medium text-text-secondary">
            {index + 1}
          </span>
          <code className="min-w-0 whitespace-pre-wrap break-all">{highlightLine(line)}</code>
        </div>
      ))}
    </pre>
  )
}
