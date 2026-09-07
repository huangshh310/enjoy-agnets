/**
 * 思考段工具条：引用步骤 + 复制原文。
 */
import { useState } from "react"
import { RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { QuoteStepButton } from "@renderer/components/ai-chat/composer/runtime-interact/quote-step-button"
import { useT } from "@renderer/i18n"
import type { AgentStepNode } from "../agent-step-tree.types"

export function ThinkingBranchActions({
  node,
  rawText,
  open
}: {
  node?: AgentStepNode
  rawText: string
  open: boolean
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    void navigator.clipboard.writeText(rawText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
      {node ? <QuoteStepButton node={node} /> : null}
      {open ? (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex cursor-pointer items-center gap-1 text-caption-2-regular text-text-tertiary hover:text-text-primary"
        >
          {copied ? (
            <>
              <RiCheckLine className="size-3 text-state-success-text" />
              <span className="text-state-success-text">{t("common.copied")}</span>
            </>
          ) : (
            <>
              <RiClipboardLine className="size-3" />
              <span>{t("chat.copyThinking")}</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
