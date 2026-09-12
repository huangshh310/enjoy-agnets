/**
 * 配置抽屉信任卡的投影：健康四态 + 过旧替换 + 条件本月用量。
 * 视觉锁 design/previews/p0-b-drawer-trust.html（f48ab0d）；
 * 过旧另认 design/previews/p0-e-cli-outdated.html（4d33f07）。
 */
import type { AgentToolDoctorResult, AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"

export type TrustHealthKind = "idle" | "checking" | "pass" | "fail" | "outdated"

export type TrustHealthView = {
  kind: TrustHealthKind
  /** 单行正文，失败原因已收成短句。 */
  label: string
  /** 超宽截断时悬停看全句。 */
  title: string
  dotClass: string
  textClass: string
  ctaDisabled: boolean
}

export type TrustUsageKind = "monthly" | "empty"

export type TrustUsageView = {
  kind: TrustUsageKind
  label: string
  /** 仅官方本月数字才给「查看详情」。 */
  showDetail: boolean
}

export type TrustDoctorSnapshot = {
  result: AgentToolDoctorResult
  ranAt: number
}

export type TrustHealthInput = {
  checking: boolean
  result: AgentToolDoctorResult | null
  ranAt: number | null
  now: number
  t: (path: string, vars?: Record<string, string | number>) => string
  /** 过旧替换健康行；检测中仍优先避免闪绿灯。 */
  outdatedLabel?: string | null
}

export type TrustUsageInput = {
  quota: boolean
  quotaInfo?: AgentToolQuotaInfo
  selectedModel?: string
  t: (path: string, vars?: Record<string, string | number>) => string
}
