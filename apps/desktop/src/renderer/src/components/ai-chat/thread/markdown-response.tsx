/**
 * 助手 Markdown 回答：MessageResponse / Streamdown + BoardUI 围栏。
 * 围栏走 components.code；http(s) 链接点进右栏浏览器，不整窗跳走。
 */
import type { AnchorHTMLAttributes, MouseEvent } from "react"
import { MessageResponse } from "@/components/ai-elements/message"
import { cx } from "@/utils/cx"
import { openBrowserUrl } from "@renderer/components/ai-chat/right-pane/open-pane"
import { parseHttpUrl } from "@renderer/lib/http-url"
import { MarkdownFence, MarkdownInlineCode } from "./markdown-fence"

const MARKDOWN_CLASS = cx(
  "size-full max-w-none text-body-medium text-text-primary",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-title-3-semibold [&_h1]:text-text-primary",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-title-3-semibold [&_h2]:text-text-primary",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-title-3-semibold [&_h3]:text-text-primary",
  "[&_p]:my-2 [&_p]:text-text-primary",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-text-primary",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-text-primary",
  "[&_li]:my-0.5",
  "[&_strong]:text-title-3-semibold [&_strong]:text-text-primary",
  "[&_em]:italic",
  "[&_a]:text-accent-600 [&_a]:underline-offset-2 hover:[&_a]:underline",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border-button-default [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary",
  "[&_hr]:my-4 [&_hr]:border-separator-border",
  "[&_table]:my-3 [&_table]:w-full [&_table]:text-caption-1-medium",
  "[&_th]:border-b [&_th]:border-separator-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left",
  "[&_td]:border-b [&_td]:border-separator-border [&_td]:px-2 [&_td]:py-1.5"
)

function MarkdownLink({
  href,
  children,
  onClick,
  node: _node,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => onMarkdownLinkClick(event, href, onClick)}
    >
      {children}
    </a>
  )
}

function onMarkdownLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string | undefined,
  onClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"]
) {
  onClick?.(event)
  if (event.defaultPrevented || !href) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (!parseHttpUrl(href)) return
  event.preventDefault()
  openBrowserUrl(href)
}

const FENCE_COMPONENTS = {
  code: MarkdownFence,
  inlineCode: MarkdownInlineCode,
  a: MarkdownLink
}

const STREAMDOWN_CONTROLS = {
  code: { copy: true, download: false }
} as const

export function MarkdownResponse({
  children,
  className
}: {
  children: string
  className?: string
}) {
  if (!children.trim()) return null
  return (
    <MessageResponse
      className={cx(MARKDOWN_CLASS, className)}
      components={FENCE_COMPONENTS}
      controls={STREAMDOWN_CONTROLS}
      lineNumbers={false}
    >
      {children}
    </MessageResponse>
  )
}
