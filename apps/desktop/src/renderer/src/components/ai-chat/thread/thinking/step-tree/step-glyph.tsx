/**
 * 步骤种类图标：Remix，不用 emoji。
 */
import {
  RiBrainLine,
  RiCpuLine,
  RiEditLine,
  RiGlobalLine,
  RiSearchLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { AgentStepKind } from "../agent-step-tree.types"

export function StepGlyph({ kind }: { kind: AgentStepKind }) {
  const cls = "size-3.5 shrink-0 text-text-tertiary"
  if (kind === "thinking") return <RiBrainLine className="size-3.5 shrink-0 text-accent-500" />
  if (kind === "search") return <RiSearchLine className={cls} />
  if (kind === "reading") return <RiGlobalLine className={cls} />
  if (kind === "command") return <RiTerminalBoxLine className={cls} />
  if (kind === "editing") return <RiEditLine className={cls} />
  if (kind === "analysis") return <RiCpuLine className={cls} />
  return <RiSparklingLine className="size-3.5 shrink-0 text-accent-500" />
}
