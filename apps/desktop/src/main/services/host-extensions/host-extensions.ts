/**
 * 宿主扩展投影：当前 runtime 消费 #/mcp 与技能索引。renderer 不调用。
 */
import { capabilitiesFor, formatSkillCatalog, type HostInjectSnapshot } from "@enjoy-agents/ipc-contract"
import type { AcpMcpServer } from "@enjoy-agents/agent-harness/acp-mcp"
import { listInstalledSkills } from "../skills-service.ts"
import { snapshotFromReports } from "./collect-host-inject.ts"
import { stageGrokHostPluginDirs } from "./grok-plugin-dir.ts"
import { lookupRemoteStdioBin } from "./lookup-remote-stdio.ts"
import { reportHostMcp } from "./host-mcp-report.ts"

export type HostExtensions = {
  mcpServers: AcpMcpServer[]
  skillCatalog: string
  /** 仅 Grok 本机 ACP：`--plugin-dir` 指向宿主技能包装。SSH 为空。 */
  pluginDirs: string[]
  inject: HostInjectSnapshot
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
  const mcp = await reportHostMcp({
    enabled: cap.hostMcp === "acp-passthrough",
    ssh,
    lookupRemoteBin:
      ssh && workspaceId ? (bin) => lookupRemoteStdioBin(workspaceId, bin) : undefined
  })
  const skills = listInstalledSkills({ workspacePath: input.workspaceRoot })
  const skillCatalog =
    cap.hostSkills === "catalog-prompt"
      ? formatSkillCatalog(skills, { workspaceRoot: input.workspaceRoot })
      : ""
  const pluginDirs =
    input.runtimeId === "grok" && !ssh ? stageGrokHostPluginDirs({ workspaceRoot: input.workspaceRoot }) : []
  return {
    mcpServers: mcp.servers,
    skillCatalog,
    pluginDirs,
    inject: snapshotFromReports({
      runtimeId: input.runtimeId,
      mcp,
      skills,
      workspaceRoot: input.workspaceRoot,
      skillsMounted: pluginDirs.length > 0
    })
  }
}
