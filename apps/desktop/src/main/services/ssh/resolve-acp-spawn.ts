/**
 * 按工作区 kind 决定 ACP spawn：local 现状，ssh 走计划后的 ssh argv。
 */
import { agentToolPreset } from "@enjoy-agents/agent-harness"
import { catalogBasenamesFrom, planAcpSshSpawn, toAcpSpawnDirect, type AcpSpawnDirect } from "./acp-ssh-spawn.ts"
import { assertSshPoolConnected } from "./refuse-local-cwd.ts"
import { getWorkspace } from "../workspace"
import { sshSpecFromRecord } from "../workspace-ssh.ts"

export async function resolveAcpSpawnDirect(input: {
  workspaceId?: string
  runtimeId: string
  workspaceRoot: string
  extraArgs: string[]
  modelId?: string
}): Promise<AcpSpawnDirect | undefined> {
  if (!input.workspaceId) return undefined
  const record = await getWorkspace(input.workspaceId)
  if (record.kind !== "ssh") return undefined
  assertSshPoolConnected(record.id, "acp")
  const preset = agentToolPreset(input.runtimeId)
  const binary = preset?.binaries[0]
  if (!binary) throw new Error(`远端未找到 ${input.runtimeId}`)
  const allowed = catalogBasenamesFrom(preset.binaries)
  const acpArgs = [...(preset.acpArgs ?? []), ...input.extraArgs]
  if (input.modelId) acpArgs.push("--model", input.modelId)
  const spec = sshSpecFromRecord(record)
  const plan = planAcpSshSpawn({
    kind: "ssh",
    catalogBasename: binary,
    allowedBasenames: allowed,
    acpArgs,
    ssh: {
      user: spec.user,
      host: spec.host,
      port: spec.port,
      auth: spec.auth,
      keyPath: spec.keyPath,
      password: spec.password,
      remotePath: spec.remotePath,
      transport: spec.transport
    }
  })
  return toAcpSpawnDirect(plan)
}
