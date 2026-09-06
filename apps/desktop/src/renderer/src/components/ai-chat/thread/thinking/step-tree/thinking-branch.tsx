/**
 * 思考过程折叠：去卡片化左侧引线 + 字数 + 复制。
 */
import { useEffect, useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"

export function lastThinkingNodeId(nodes: Array<{ id: string; kind: string }>): string | null {
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]
    if (node?.kind === "thinking") return node.id
  }
  return null
}

export function ThinkingNodeBranch({
  title,
  rawText,
  defaultOpen = true
}: {
  title: string
  rawText: string
  defaultOpen?: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    void navigator.clipboard.writeText(rawText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="group inline-flex cursor-pointer items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary hover:text-accent-500"
        >
          <span>{title}</span>
          <span className="font-mono text-caption-2-regular font-normal text-text-tertiary">
            ({t("chat.cotChars", { count: rawText.length })})
          </span>
          {open ? (
            <RiArrowDownSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500" />
          ) : (
            <RiArrowRightSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500" />
          )}
        </button>
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
      {open ? (
        <div className="my-1 ml-0.5 border-l-2 border-border-button-default/80 pl-3">
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap pr-2 font-sans text-caption-1-regular leading-relaxed text-text-secondary/85">
            {rawText}
          </div>
        </div>
      ) : null}
    </div>
  )
}
