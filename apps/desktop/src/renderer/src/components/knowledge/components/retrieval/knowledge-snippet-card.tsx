/**
 * 检索命中卡。主 CTA 为钉到当前对话，由页面 handlePinToChat 写入会话芯片。
 */
import { useEffect, useRef, useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiPushpinLine
} from "@remixicon/react"
import type { KnowledgeHit } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function KnowledgeSnippetCard({
  hit,
  focused = false,
  onPreviewDoc,
  onPin,
  onFilterSource
}: {
  hit: KnowledgeHit
  focused?: boolean
  onPreviewDoc?: (path: string) => void
  onPin: () => void
  onFilterSource?: () => void
}) {
  const t = useT()
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [pinned, setPinned] = useState(false)

  useEffect(() => {
    if (!focused) return
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [focused])
  const scorePercent = Math.round((hit.score ?? 0) * 100)
  const showSemanticPercent = hit.embeddingKind === "provider" && scorePercent > 0

  function handleCopy() {
    void navigator.clipboard.writeText(hit.snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePin() {
    onPin()
    setPinned(true)
    setTimeout(() => setPinned(false), 2500)
  }

  return (
    <div
      ref={cardRef}
      data-testid={focused ? "knowledge-cited-hit" : undefined}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border border-l-2 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-separator-border hover:shadow-card",
        focused
          ? "border-accent-500 border-l-accent-500 ring-2 ring-accent-500/40"
          : "border-separator-border/70 border-l-accent-500"
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-2"
            onClick={() => onPreviewDoc?.(hit.path)}
            title={hit.path}
          >
            <RiFileTextLine className="size-3.5 shrink-0 text-text-tertiary" />
            <span className="truncate font-mono text-caption-2-medium text-text-primary hover:underline">
              {hit.path}
            </span>
            {focused ? (
              <span className="shrink-0 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium text-accent-700 dark:text-accent-300">
                {t("pages.knowledge.citedFromChat")}
              </span>
            ) : null}
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            {showSemanticPercent ? (
              <span className="rounded-md border border-separator-border/40 bg-background-secondary-default/80 px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.matchPercent", { n: scorePercent })}
              </span>
            ) : hit.embeddingKind === "lexical" ? (
              <span className="rounded-md border border-separator-border/40 bg-background-secondary-default/80 px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.lexicalMatch")}
              </span>
            ) : hit.embeddingKind === "hashed" ? (
              <span className="rounded-md border border-separator-border/40 bg-background-secondary-default/80 px-2 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.hashedMatch")}
              </span>
            ) : null}
            {onFilterSource ? (
              <button
                type="button"
                onClick={onFilterSource}
                className="cursor-pointer rounded-md bg-background-secondary-default/50 px-1.5 py-0.5 font-mono text-caption-2-medium text-text-tertiary hover:text-text-secondary"
              >
                {t("pages.knowledge.singleLens")}
              </button>
            ) : null}
          </div>
        </div>
        <p className="line-clamp-3 rounded-xl border border-separator-border/30 bg-background-secondary-default/20 p-2.5 font-mono text-caption-1-regular text-text-secondary">
          {hit.snippet}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-separator-border/40 pt-2.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 gap-1 px-2 text-caption-2-medium text-text-tertiary hover:text-text-primary"
        >
          {copied ? <RiCheckLine className="size-3 text-emerald-500" /> : <RiClipboardLine className="size-3" />}
          <span>{copied ? t("pages.knowledge.copied") : t("pages.knowledge.copySnippet")}</span>
        </Button>
        {onPreviewDoc ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPreviewDoc(hit.path)}
            className="h-7 gap-1 px-2 text-caption-2-medium text-text-tertiary hover:text-text-primary"
          >
            <RiExternalLinkLine className="size-3" />
            <span>{t("pages.knowledge.viewSourceFile")}</span>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={pinned ? "outline" : "default"}
          onClick={handlePin}
          className={cx(
            "h-7 gap-1 px-2.5 text-caption-2-medium shadow-2xs",
            pinned && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
          title={t("pages.knowledge.pinToChat")}
        >
          {pinned ? <RiCheckLine className="size-3.5 text-emerald-500" /> : <RiPushpinLine className="size-3.5" />}
          <span>{pinned ? t("pages.knowledge.pinnedToChat") : t("pages.knowledge.pinToChat")}</span>
        </Button>
      </div>
    </div>
  )
}
