/**
 * 宿主扩展投影：当前 runtime 消费 #/mcp 与技能索引。renderer 不调用。
 */
import { capabilitiesFor, formatSkillCatalog } from "@enjoy-agents/ipc-contract"
import type { AcpMcpServer } from "@enjoy-agents/agent-harness/acp-mcp"
import { listInstalledSkills } from "../skills-service.ts"
import { stageGrokHostPluginDirs } from "./grok-plugin-dir.ts"
import { lookupRemoteStdioBin } from "./lookup-remote-stdio.ts"
import { projectHostMcp } from "./project-mcp.ts"

export type HostExtensions = {
  mcpServers: AcpMcpServer[]
  skillCatalog: string
  /** 仅 Grok 本机 ACP：`--plugin-dir` 指向宿主技能包装。SSH 为空。 */
  pluginDirs: string[]
}

export async function hostExtensionsFor(input: {
  runtimeId: string
  workspaceRoot: string
  ssh?: boolean
  workspaceId?: string
}): Promise<HostExtensions> {
  const cap = capabilitiesFor(input.runtimeId)
  const ssh = Boolean(input.ssh)
  const workspaceId = input.workspaceId?.trim()
  const mcpServers = await projectHostMcp({
    enabled: cap.hostMcp === "acp-passthrough",
    ssh,
    lookupRemoteBin:
      ssh && workspaceId ? (bin) => lookupRemoteStdioBin(workspaceId, bin) : undefined
  })
  const skillCatalog =
    cap.hostSkills === "catalog-prompt"
      ? formatSkillCatalog(listInstalledSkills({ workspacePath: input.workspaceRoot }), {
          workspaceRoot: input.workspaceRoot
        })
      : ""
  const pluginDirs =
    input.runtimeId === "grok" && !ssh ? stageGrokHostPluginDirs({ workspaceRoot: input.workspaceRoot }) : []
  return { mcpServers, skillCatalog, pluginDirs }
}
