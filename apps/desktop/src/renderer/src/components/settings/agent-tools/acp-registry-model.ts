/**
 * Registry 详情态：未找到才走安装/复制；有配方才一键，否则仅复制。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import type { RegistryStatus } from "./acp-registry.types"

export type RegistryInstallAction = "install" | "copy" | "none"

/** 未找到：npm/brew 一键；copy-only 只复制；即将推出不装。 */
export function registryInstallAction(
  tool: Pick<AgentToolPublic, "installKind" | "installCommand">,
  status: RegistryStatus
): RegistryInstallAction {
  if (status !== "missing") return "none"
  if (tool.installKind && tool.installKind !== "copy") return "install"
  if (tool.installCommand?.trim()) return "copy"
  return "none"
}

/** 未找到展示安装命令；已装才展示启动预览。禁止把未装画成已连接。 */
export function registryCommandFor(
  tool: Pick<AgentToolPublic, "installCommand" | "binaries" | "acpArgs">,
  status: RegistryStatus
): string {
  if (status === "missing") return tool.installCommand?.trim() || ""
  return [tool.binaries[0], ...tool.acpArgs].filter(Boolean).join(" ")
}

export function isRegistryNotReady(status: RegistryStatus): boolean {
  return status === "missing"
}
