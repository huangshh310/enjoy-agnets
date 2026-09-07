/**
 * 步骤树右侧「引用」：点入 Composer Chip，不打断当前展开。
 */
import { RiDoubleQuotesL } from "@remixicon/react"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { quoteFromStep } from "@renderer/lib/quote-from-step"
import type { AgentStepNode } from "@renderer/components/ai-chat/thread/thinking/agent-step-tree.types"
import { useT } from "@renderer/i18n"

export function QuoteStepButton({ node }: { node: AgentStepNode }) {
  const t = useT()
  return (
    <button
      type="button"
      title={t("chat.quoteStep")}
      aria-label={t("chat.quoteStep")}
      onClick={(event) => {
        event.stopPropagation()
        addQuotedContext(quoteFromStep(node))
      }}
      className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary opacity-70 transition-opacity hover:bg-background-secondary-hover hover:text-text-primary hover:opacity-100"
    >
      <RiDoubleQuotesL className="size-3.5" aria-hidden />
    </button>
  )
}
