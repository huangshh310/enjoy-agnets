/**
 * 助手轮可见工具表面：File Diff / Tool Result。
 * Todo List 在输入框上方，不进气泡。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { ToolResultView } from "../../diff/tool-result"
import { hasTurnToolSurfaces, toolResultSurfaces } from "./select-turn-tool-surfaces"

export function TurnToolSurfaces({ tools }: { tools: ThreadToolCall[] }) {
  if (!hasTurnToolSurfaces(tools)) return null

  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      {toolResultSurfaces(tools).map((tool) => (
        <ToolResultView key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
