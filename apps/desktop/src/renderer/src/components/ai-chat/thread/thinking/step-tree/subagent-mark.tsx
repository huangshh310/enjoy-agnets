/**
 * 子智能体行左侧 Blobatar 面孔。不锁 hue/tone，让种子名驱动五官和颜色。
 * 不要走 BlobatarAvatar 默认旗舰蓝，也不要请求 blobatar.dev。
 */
import { Blobatar } from "@blobatar/react"
import * as expressions from "blobatar/expression"
import type { SubagentPersona } from "../subagent-persona"

const MARK_SIZE = 18

export function SubagentMark({
  persona,
  running = false
}: {
  persona: SubagentPersona
  running?: boolean
}) {
  const expressionObj = expressions[persona.expression as keyof typeof expressions]
  const expr = typeof expressionObj === "object" ? (expressionObj as expressions.Expression) : undefined

  return (
    <span
      className="inline-flex size-[18px] shrink-0 items-center justify-center"
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
