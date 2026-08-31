/**
 * Streamdown 围栏替换：单行 shell 走轻量 Run 行，多行走 DESIGN 代码卡。
 * 官方接入点是 components.code / inlineCode，以及 controls.code.download=false。
 */
import { isValidElement, useState, type HTMLAttributes, type ReactNode } from "react"
import { RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { cx } from "@/utils/cx"
import { highlightLine } from "../ai-chat-syntax"

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
    return <CommandFence code={code} />
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
function CommandFence({ code }: { code: string }) {
  return (
    <div className="my-2 flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-caption-1-semibold text-text-tertiary">Run</span>
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] leading-6 text-text-primary">
        <code className="whitespace-pre">{highlightLine(code)}</code>
      </pre>
      <FenceCopyButton code={code} />
    </div>
  )
}

/** 多行 snippet：16px 半径、whisper 边框、语言 chip + 安静复制。 */
function SnippetFence({
  language,
  code,
  filename
}: {
  language: string
  code: string
  filename?: string
}) {
  const lines = code.split("\n")
  const showLines = lines.length > 2

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default">
      <div className="flex items-center gap-2 border-b border-separator-border px-3 py-2">
        {language ? (
          <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-caption-1-semibold lowercase text-text-secondary">
            {language}
          </span>
        ) : null}
        {filename ? (
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-secondary">
            {filename}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <FenceCopyButton code={code} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6 text-text-primary">
        {lines.map((line, index) => (
          <div key={`${index}-${line.slice(0, 24)}`} className="flex gap-4">
            {showLines ? (
              <span className="w-4 shrink-0 text-right tabular-nums text-text-tertiary">
                {index + 1}
              </span>
            ) : null}
            <code className="whitespace-pre">{highlightLine(line)}</code>
          </div>
        ))}
      </pre>
    </div>
  )
}

function FenceCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const Icon = copied ? RiCheckLine : RiClipboardLine

  return (
    <QuietIconButton
      icon={Icon}
      aria-label={copied ? "Copied" : "Copy snippet"}
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
