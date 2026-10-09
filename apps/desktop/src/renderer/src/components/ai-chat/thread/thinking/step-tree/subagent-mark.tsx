/**
 * 子智能体行左侧 Blobatar 面孔。不锁 hue/tone，让种子名驱动五官和颜色。
 * 不要走 BlobatarAvatar 默认旗舰蓝，也不要请求 blobatar.dev。
 */
import { Blobatar } from "@blobatar/react"
import * as expressions from "blobatar/expression"
import { cx } from "@/utils/cx"
import type { SubagentPersona } from "../subagent-persona"

const MARK_SIZE = 16

export function SubagentMark({
  persona,
  running = false
}: {
  persona: SubagentPersona
  running?: boolean
}) {
  // blobatar 把每个表情挂在同名 namespace 导出上，只能按名取。
  // eslint-disable-next-line import/namespace
  const expressionObj = expressions[persona.expression as keyof typeof expressions]
  const expr = typeof expressionObj === "object" ? (expressionObj as expressions.Expression) : undefined

  return (
    <span
      className={cx(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-background-tertiary-default/80 ring-1 ring-border-button-default/60 shadow-2xs transition-transform duration-200",
        running && "ring-accent-500/50"
      )}
      title={persona.seed}
      aria-hidden
    >
      <Blobatar
        name={persona.seed}
        size={MARK_SIZE}
        background={false}
        expression={expr}
        animate={running ? "always" : "hover"}
        className="overflow-visible object-contain"
      />
    </span>
  )
}
