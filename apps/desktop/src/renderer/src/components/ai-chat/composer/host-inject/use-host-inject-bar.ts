/**
 * 读当前引擎能力、SoT 已启用数、本轮注入快照，收成 Composer 微条视图。
 */
import { useQuery } from "@tanstack/react-query"
import type { McpServer, SkillItem } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { useHostInjectStore } from "@renderer/stores/host-inject/host-inject-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { hostInjectBarView } from "./host-inject-view.ts"

export function useHostInjectBar() {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const sessionId = useChatStore((state) => state.sessionId)
  const snapshot = useHostInjectStore((state) =>
    sessionId ? state.bySession[sessionId] : undefined
  )
  const mcpQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const skillsQuery = useQuery({
    queryKey: ["skills", "list", useChatStore.getState().workspaceRootPath],
    enabled: hasIde(),
    queryFn: () =>
      getIde().skills.list({
        workspacePath: useChatStore.getState().workspaceRootPath ?? undefined
      }) as Promise<SkillItem[]>
  })
  const enabledMcp = mcpQuery.data?.filter((row) => row.trusted).length ?? 0
  const enabledSkills = skillsQuery.data?.length ?? 0
  return hostInjectBarView({
    runtimeId,
    snapshot: snapshot?.runtimeId === runtimeId ? snapshot : undefined,
    enabledMcp,
    enabledSkills
  })
}
