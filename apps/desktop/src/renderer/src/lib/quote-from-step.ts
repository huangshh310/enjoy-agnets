/**
 * 把步骤树节点收成 QuotedContext。content / snippet 同步写入，截断避免撑爆 Prompt。
 */
import type { QuotedContext } from "@enjoy-agents/ipc-contract"

/** 与 `@enjoy-agents/ipc-contract` 的 `QUOTE_SNIPPET_MAX` 对齐；此处不引运行时值，避免 node 单测打爆桶导出。 */
const SNIPPET_MAX = 2000
import type { AgentStepNode } from "@renderer/components/ai-chat/thread/thinking/agent-step-tree.types"

/** 步骤反查：思考 / 编辑 / 读文件 / 命令分别落到合同类型。 */
export function quoteFromStep(node: AgentStepNode): QuotedContext {
  const body = (node.command || node.output || node.detail || node.rawText || node.title)
    .trim()
    .slice(0, SNIPPET_MAX)
  return {
    id: `quote_${node.id}`,
    sourceId: node.id,
    type: quoteType(node),
    title: node.fileName || node.title,
    snippet: body,
    content: body,
    metadata: {
      stepId: node.id,
      path: node.filePath,
      kind: node.kind
    }
  }
}

function quoteType(node: AgentStepNode): QuotedContext["type"] {
  if (node.kind === "thinking") return "task_step"
  if (node.kind === "command") return "terminal_output"
  if (node.kind === "editing" && node.filePath) return "diff"
  if (node.filePath) return "file"
  return "tool_call"
}
