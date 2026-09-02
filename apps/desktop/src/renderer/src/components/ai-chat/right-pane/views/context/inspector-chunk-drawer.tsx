/**
 * 引用切片抽屉：路径、行号、原文。CitedSource 无相似度字段则不画分数。
 */
import { useState } from "react"
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiClipboardLine,
  RiExternalLinkLine,
  RiFileLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { CitedSource } from "@enjoy-agents/ipc-contract"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"
import { estimateCharTokens } from "./context-token-estimator.ts"

export function InspectorChunkDrawer({
  source,
  onBack
}: {
  source: CitedSource
  onBack: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const lineLabel = source.startLine ? `L${source.startLine}` : null

  function handleCopy() {
    void navigator.clipboard.writeText(source.snippet || "").then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 animate-in flex-col gap-3 p-3.5 duration-200 fade-in-50 slide-in-from-right-2">
      <div className="flex items-center justify-between gap-2 border-b border-separator-border/60 pb-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 text-caption-2-medium text-accent-500 transition-colors hover:text-text-primary"
        >
          <RiArrowLeftLine className="size-3.5" />
          <span>{t("chat.inspectorBack")}</span>
        </button>
        <span className="font-mono text-caption-2-medium text-text-tertiary">
          {t("chat.inspectorChunkTitle")}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 font-mono shadow-2xs">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
            <RiFileLine className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-caption-1-medium font-semibold text-text-primary">
              {source.title || source.path}
            </h4>
            <p className="truncate text-caption-2-regular text-text-tertiary">{source.path}</p>
          </div>
          {lineLabel ? (
            <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-regular text-text-secondary">
              {lineLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between text-caption-2-regular text-text-tertiary">
          <span>{t("chat.inspectorChunkBody")}</span>
          <span>~{estimateCharTokens(source.snippet?.length ?? 0)}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-separator-border/70 bg-background-secondary-default/40 p-3 font-mono text-caption-2-regular leading-relaxed text-text-primary">
          <pre className="whitespace-pre-wrap break-all font-mono">
            {source.snippet || t("chat.inspectorNoSnippet")}
          </pre>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-separator-border/60 pt-2.5">
        <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 gap-1 px-2.5 text-caption-2-medium">
          {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
          <span>{copied ? t("common.copied") : t("chat.inspectorCopyChunk")}</span>
        </Button>
        <Button
          size="sm"
          onClick={() => void openChangedFile(source.path)}
          className="h-7 gap-1 px-3 text-caption-2-medium"
        >
          <RiExternalLinkLine className="size-3" />
          <span>{t("chat.inspectorOpenReview")}</span>
        </Button>
      </div>
    </div>
  )
}
