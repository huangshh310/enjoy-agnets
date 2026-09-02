/**
 * 上下文检查器：只组合真实芯片、引用、工具状态与运行时。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { InspectorChips } from "./context/inspector-chips"
import { InspectorRuntime } from "./context/inspector-runtime"
import { InspectorSources } from "./context/inspector-sources"
import { InspectorTools } from "./context/inspector-tools"
import { citedSourcesFromMessages, toolsFromMessages } from "./context/thread-run-slice"

export function ContextInspectorView({ workspaceId }: { workspaceId: string | null }) {
  const modelId = useChatStore((state) => state.modelId)
  const modelLabel = useChatStore((state) => state.modelLabel)
  const mode = useChatStore((state) => state.mode)
  const messages = useChatStore((state) => state.messages)
  const running = useChatStore((state) => state.running)
  const sources = citedSourcesFromMessages(messages)
  const tools = toolsFromMessages(messages)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
      <InspectorChips workspaceId={workspaceId} />
      <InspectorSources sources={sources} />
      <InspectorTools tools={tools} running={running} />
      <InspectorRuntime modelId={modelId} modelLabel={modelLabel} mode={mode} />
    </div>
  )
}
