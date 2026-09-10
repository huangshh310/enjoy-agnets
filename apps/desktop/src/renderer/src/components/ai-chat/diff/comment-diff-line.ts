/**
 * 把 diff 行做成引用，纠偏或新开一轮。
 */
import type { DiffLine } from "@enjoy-agents/agent-core/diff"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { steerPreparedText } from "@renderer/hooks/runtime-interact/steer-composer"

export function commentDiffLine(path: string, line: DiffLine): void {
  const mark = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "
  const loc = line.newNo ?? line.oldNo ?? "?"
  const body = `${mark}${line.text}`
  addQuotedContext({
    id: `diff-${path}-${loc}-${Date.now()}`,
    type: "diff",
    title: `${path}:${loc}`,
    content: body,
    snippet: body
  })
  void steerPreparedText(`Review comment on ${path}:${loc}. Please address this line.`)
}
