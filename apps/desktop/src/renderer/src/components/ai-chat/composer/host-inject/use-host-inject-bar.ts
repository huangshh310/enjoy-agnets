/**
 * 读当前引擎能力、SoT 已启用数、本轮注入快照，收成 Composer 微条视图。
 */
import { useQuery } from "@tanstack/react-query"
import type { McpServer, SkillItem } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { useHostInjectStore } from "@renderer/stores/host-inject/host-inject-store"
import { getIde, hasIde } from "@renderer/lib/ide"
import { hostInjectEnabledCounts } from "./host-inject-chip-label.ts"
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
  const queryMcp = mcpQuery.data?.filter((row) => row.trusted).length ?? 0
  const querySkills = skillsQuery.data?.length ?? 0
  const sameRuntime = snapshot?.runtimeId === runtimeId
  const enabled = hostInjectEnabledCounts({
    snapshotEnabledMcp: snapshot?.mcp.enabled.length,
    snapshotEnabledSkills: snapshot?.skills.enabled.length,
    queryMcp,
    querySkills,
    sameRuntime: Boolean(sameRuntime)
  })
  return {
    view: hostInjectBarView({
      runtimeId,
      snapshot: sameRuntime ? snapshot : undefined,
      enabledMcp: queryMcp,
      enabledSkills: querySkills
    }),
    enabledMcp: enabled.mcp,
    enabledSkills: enabled.skills
  }
}
