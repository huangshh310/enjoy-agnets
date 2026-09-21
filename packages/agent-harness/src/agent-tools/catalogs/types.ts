/**
 * 本机 CLI 目录类型：模型表、安装配方、登录入口。
 * 登录二进制可以和 ACP 入口不同（amp login vs amp-acp）。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"

export type AgentCliModelDef = {
  id: string
  label: string
}

export type InstallStep = {
  manager: "npm" | "brew"
  args: readonly string[]
  /** 写死的卸载 argv，禁止从 install 参数推断。 */
  uninstallArgs?: readonly string[]
}

export type AgentToolCatalog = {
  models: AgentCliModelDef[]
  defaultModel?: string
  steps: InstallStep[]
  installCommand: string
  docsUrl: string
  loginArgs: string[]
  /** 已装时对 PATH 上那份二进制跑官方自更新（如 claude update），给普通用户一键升级。 */
  selfUpdateArgs?: readonly string[]
  /** 登录用的 basename；缺省则用探测到的 ACP 二进制。 */
  loginBinary?: string
  /** 原生插件在系统终端执行；Enjoy 不代跑。 */
  nativePluginCopy?: string
}

export type { AgentToolId }
