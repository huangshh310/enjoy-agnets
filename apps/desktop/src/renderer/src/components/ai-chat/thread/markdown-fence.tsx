/**
 * Streamdown 围栏替换：单行 shell 走轻量 Run 行，多行走 DESIGN 代码卡。
 * 代码高亮复用右栏 Shiki（css-variables + 缓存）；官方接入点是 components.code / inlineCode。
 */
import {
  isValidElement,
  useState,
  type HTMLAttributes,
  type ReactNode
} from "react"
import { RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { cx } from "@/utils/cx"
import { MermaidFence } from "./mermaid/mermaid-fence"
import { highlightLine } from "../ai-chat-syntax"
import { languageFromFenceLang } from "../syntax/language"
import { SHIKI_FENCE_TOKEN_VARS, SHIKI_TOKEN_VARS, useShikiHtml } from "../syntax/use-shiki-html"
import { useT } from "@renderer/i18n"

const SHELL_LANGS = new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "console",
  "shellscript",
  "fish",
  "powershell",
  "ps1",
  "bat",
  "cmd"
])

const LANGUAGE_RE = /language-([^\s]+)/
const FILENAME_RE = /(?:title|filename)=["']([^"']+)["']/

const FENCE_PRE_CLASS =
  "[&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:p-0 [&>pre]:font-mono [&>pre]:text-body-2-regular [&>pre]:leading-6 [&_code]:font-mono"

type FenceProps = HTMLAttributes<HTMLElement> & {
  node?: { properties?: Record<string, unknown> }
  "data-block"?: string | boolean
}

/** Streamdown 默认 pre 会把 data-block 克隆到 code 上，用来区分围栏与行内。 */
export function MarkdownFence({ className, children, node, "data-block": dataBlock }: FenceProps) {
  const language = className?.match(LANGUAGE_RE)?.[1] ?? ""
  const isBlock = dataBlock != null || Boolean(language)
  if (!isBlock) return <MarkdownInlineCode className={className}>{children}</MarkdownInlineCode>

  const code = readFenceText(children)
  const filename = readFilename(node?.properties?.metastring)
  if (isCommandFence(language, code)) {
    return <CommandFence code={code} language={language} />
  }
  if (language.toLowerCase() === "mermaid") {
    return (
      <MermaidFence
        code={code}
        fallback={<SnippetFence language={language} code={code} filename={filename} />}
      />
    )
  }
  return <SnippetFence language={language} code={code} filename={filename} />
}

export function MarkdownInlineCode({
  className,
  children
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <code
      className={cx(
        "rounded-md bg-background-tertiary-default px-1 py-0.5 font-mono text-caption-1-regular text-text-primary",
        className
      )}
    >
      {children}
    </code>
  )
}

/** 单行命令：Beautiful UI Coding 形态，无灰底卡片、无下载。 */
function CommandFence({ code, language }: { code: string; language: string }) {
  const t = useT()
  const syntax = languageFromFenceLang(language || "bash")
  const html = useShikiHtml(code, syntax, { lineNumbers: false })

  return (
    <div className="my-2 flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-caption-1-semibold text-text-tertiary">{t("chat.run")}</span>
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-body-2-regular leading-6 text-text-primary">
        {html ? (
          <span
            className={cx("block [&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:p-0 [&_code]:font-mono", SHIKI_TOKEN_VARS)}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <code className="whitespace-pre">{highlightLine(code)}</code>
        )}
      </pre>
      <FenceCopyButton code={code} />
    </div>
  )
}

/** 多行 snippet：16px 半径、whisper 边框、语言 chip + 安静复制；Shiki 对齐右栏。 */
function SnippetFence({
  language,
  code,
  filename
}: {
  language: string
  code: string
  filename?: string
}) {
  const t = useT()
  const lines = code.split("\n")
  const showLines = lines.length > 2
  const [expanded, setExpanded] = useState(false)
  const collapsed = lines.length > 16 && !expanded
  const visible = collapsed ? lines.slice(0, 16) : lines
  const visibleCode = visible.join("\n")
  const syntax = languageFromFenceLang(language)
  // 折叠时只高亮可见段，行号与 UI 一致；展开再高亮全文。缓存命中时不闪。
  const html = useShikiHtml(visibleCode, syntax, { lineNumbers: showLines ? 'fence' : false })

  return (
    <div
      className="my-3 overflow-hidden rounded-2xl border border-border-button-default bg-neutral-925 text-background"
      data-testid="markdown-fence-snippet"
      data-language={syntax}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        {language ? (
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-caption-1-semibold lowercase text-background/90">
            {language}
          </span>
        ) : null}
        {filename ? (
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-background/70">
            {filename}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <FenceCopyButton code={code} />
      </div>
      <div className="overflow-x-auto p-3 font-mono text-body-2-regular leading-6 text-background">
        {html ? (
          <div
            className={cx(FENCE_PRE_CLASS, SHIKI_FENCE_TOKEN_VARS)}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="m-0 bg-transparent p-0 font-mono text-body-2-regular leading-6">
            {visible.map((line, index) => (
              <div key={`${index}-${line.slice(0, 24)}`} className="flex gap-4">
                {showLines ? (
                  <span className="w-4 shrink-0 text-right tabular-nums text-background/40">
                    {index + 1}
                  </span>
                ) : null}
                <code className="whitespace-pre-wrap break-words">{highlightLine(line)}</code>
              </div>
            ))}
          </pre>
        )}
      </div>
      {lines.length > 16 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full cursor-pointer border-t border-white/10 px-3 py-1.5 text-left text-caption-2-medium text-background/70 hover:bg-white/5"
        >
          {expanded ? t("chat.collapseLines") : t("chat.showAllLines")}
        </button>
      ) : null}
    </div>
  )
}

function FenceCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const t = useT()
  const Icon = copied ? RiCheckLine : RiClipboardLine

  return (
    <QuietIconButton
      icon={Icon}
      aria-label={copied ? t("common.copied") : t("chat.copySnippet")}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        })
      }}
    />
  )
}

function isCommandFence(language: string, code: string): boolean {
  if (!SHELL_LANGS.has(language.toLowerCase())) return false
  return code.split("\n").filter((line) => line.trim()).length <= 1
}

function readFilename(meta: unknown): string | undefined {
  if (typeof meta !== "string") return undefined
  return meta.match(FILENAME_RE)?.[1]
}

function readFenceText(children: ReactNode): string {
  if (typeof children === "string") return children.replace(/\n$/, "")
  if (typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(readFenceText).join("")
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return readFenceText(children.props.children)
  }
  return ""
}
