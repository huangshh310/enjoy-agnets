/**
 * 空态清单纯函数：ready / missing 分桶，缺口行只允许一个 CTA。
 * 禁止把 AgentCliInstall 整卡嵌进空态。
 */
import { isEngineReady } from "../../../../lib/engine-ready.ts"
import { DEFAULT_RUNTIME_ID } from "../../../../lib/session-runtime.ts"

export type EmptyStateTool = {
  id: string
  status: string
  skillOnly?: boolean
  comingSoon?: boolean
  installKind?: "npm" | "brew" | "copy"
}

export type MissingCtaKind = "install" | "copy"

/** 空态只列本机 CLI：去掉 Enjoy 本地、技能-only、即将推出。 */
export function splitEmptyStateTools<T extends EmptyStateTool>(tools: T[]): { ready: T[]; missing: T[] } {
  const listed = tools.filter((item) => item.id !== DEFAULT_RUNTIME_ID && !item.skillOnly && !item.comingSoon)
  return {
    ready: listed.filter((item) => isEngineReady(item)),
    missing: listed.filter((item) => item.status === "missing")
  }
}

/**
 * 缺口行唯一 CTA：npm/brew 走一键安装，其余只复制命令。
 * 文档 / 登录 / 完整安装卡不准出现在空态。
 */
export function pickMissingCta(agent: Pick<EmptyStateTool, "installKind">): MissingCtaKind {
  return agent.installKind && agent.installKind !== "copy" ? "install" : "copy"
}
