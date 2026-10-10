/**
 * 个人中心底栏三联 Bento：
 * 1. 智能体引擎与模型矩阵 (AI Engines & Models)
 * 2. 硬件安全与运行环境 (Hardware Vault & Infrastructure)
 * 3. 开发者成长与里程碑 (Achievements & Milestones)
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiFireLine,
  RiFlashlightLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiShieldLine,
  RiStackLine,
  RiTrophyLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AgentToolPublic, ProviderPublic } from "@enjoy-agents/ipc-contract"
import { profileOsName, vaultCopyKey, vaultFace } from "../lib/profile-face-copy"
import type { ExtendedUserProfile, ProfileMetricSummary } from "../types/profile.types"

interface ProfileEcosystemBentoProps {
  profile: ExtendedUserProfile
  summary: ProfileMetricSummary
  agentTools: AgentToolPublic[]
  providers: ProviderPublic[]
  protectedVault: boolean
  activeEngineLabel?: string
  activeModelLabel?: string
  activeEndpoint?: string
}

export function ProfileEcosystemBento({
  profile,
  summary,
  agentTools,
  providers,
  protectedVault,
  activeEngineLabel = "Enjoy Local",
  activeModelLabel,
  activeEndpoint
}: ProfileEcosystemBentoProps) {
  const navigate = useNavigate()
  const t = useT()
  const hasKey = useChatStore((state) => state.hasKey)
  const storageOk = useChatReadiness().data?.secretStorageAvailable
  const face = vaultFace({ hasKey, secretStorageAvailable: storageOk })
  const keychainOn = protectedVault || face === "keychain"
  const readyTools = agentTools.filter((tool) => tool.status === "ready" || tool.id === "enjoy-local")
  const activeProvider = providers.find((p) => p.active) ?? providers[0]
  const currentDevice = profile.activeDevices.find((d) => d.isCurrent) ?? profile.activeDevices[0]
  const osName = profileOsName(currentDevice?.os)
  const computerLabel = osName
    ? t("pages.account.security.thisComputer", { os: osName })
    : t("pages.account.security.thisComputerOnly")
  const vaultLabel = t(vaultCopyKey(face))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1. 智能体与模型架构卡片 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all hover:border-accent-500/30">
        <div>
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
                <RiRobot2Line className="size-4" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">助手与模型</h3>
            </div>
            <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-regular font-mono text-text-tertiary">
              {readyTools.length} 已就绪
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">当前助手</span>
              <span className="font-semibold text-text-primary">{activeEngineLabel}</span>
            </div>

            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">默认模型</span>
              <span className="font-mono font-medium text-text-primary">
                {activeModelLabel || activeProvider?.modelId || "未配置"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-caption-2-medium font-medium text-text-secondary">已就绪的助手</span>
              <div className="flex flex-wrap gap-1.5">
                {readyTools.slice(0, 5).map((tool) => (
                  <span
                    key={tool.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-secondary-default/60 px-2 py-0.5 font-mono text-caption-2-regular text-text-secondary"
                  >
                    <span className="size-1.5 rounded-full bg-state-success-base" />
                    {tool.label}
                  </span>
                ))}
                {readyTools.length === 0 ? (
                  <span className="font-mono text-caption-2-regular text-text-secondary">Enjoy 本地</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void navigate({ to: "/settings/$section", params: { section: "agent" } })}
          className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3 text-caption-2-medium text-accent-600 hover:text-accent-500 dark:text-accent-400 transition-colors cursor-pointer"
        >
          <span>管理助手与模型供应商</span>
          <RiArrowRightLine className="size-3.5" />
        </button>
      </div>

      {/* 2. 硬件安全与运行环境卡片 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all hover:border-accent-500/30">
        <div>
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl border border-state-success-text/20 bg-state-success-text/10 text-state-success-text">
                <RiShieldCheckLine className="size-4" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">密钥与本机保护</h3>
            </div>
            <span
              className={cx(
                "rounded-md px-2 py-0.5 text-caption-2-regular font-mono",
                keychainOn
                  ? "bg-state-success-text/10 text-state-success-text dark:text-state-success-text"
                  : "bg-background-secondary-default text-text-tertiary"
              )}
            >
              {vaultLabel}
            </span>
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">密钥保管</span>
              <span className="font-medium text-text-primary">{vaultLabel}</span>
            </div>

            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">界面可见内容</span>
              <span className="text-state-success-text dark:text-state-success-text">此页看不到密钥</span>
            </div>

            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">当前设备</span>
              <span className="font-mono text-text-primary">{computerLabel}</span>
            </div>

            <div className="flex items-center justify-between text-caption-2-medium">
              <span className="text-text-secondary">连接方式</span>
              <span className="font-mono text-text-secondary">
                {activeEndpoint ? `SSH: ${activeEndpoint}` : "本机环境"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3 text-caption-2-medium text-text-tertiary">
          <span>改文件和跑命令默认会先问你</span>
          <RiShieldLine className="size-3.5" />
        </div>
      </div>

      {/* 3. 开发者成长与里程碑卡片 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all hover:border-accent-500/30">
        <div>
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl border border-status-yellow-text/20 bg-status-yellow-background/10 text-status-yellow-text">
                <RiTrophyLine className="size-4" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">效能与成长里程碑</h3>
            </div>
            <span className="rounded-md bg-status-yellow-background/10 px-2 py-0.5 text-caption-2-semibold font-mono font-semibold text-status-yellow-text dark:text-status-yellow-text">
              4 项达成
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 p-2.5">
              <RiFireLine className="size-4 shrink-0 text-status-yellow-text" />
              <div className="flex flex-col min-w-0">
                <span className="text-pretty text-caption-2-medium font-semibold text-text-primary">活跃先锋</span>
                <span className="text-pretty font-mono text-caption-2-regular text-text-tertiary">{summary.topStreakDays} 连续开发</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 p-2.5">
              <RiFlashlightLine className="size-4 shrink-0 text-accent-500" />
              <div className="flex flex-col min-w-0">
                <span className="text-pretty text-caption-2-medium font-semibold text-text-primary">百万吞吐</span>
                <span className="text-pretty font-mono text-caption-2-regular text-text-tertiary">{summary.lifetimeTokens} Tokens</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 p-2.5">
              <RiShieldCheckLine className="size-4 shrink-0 text-state-success-text" />
              <div className="flex flex-col min-w-0">
                <span className="text-pretty text-caption-2-medium font-semibold text-text-primary">凭据护盾</span>
                <span className="text-pretty font-mono text-caption-2-regular text-text-secondary">{vaultLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/50 p-2.5">
              <RiStackLine className="size-4 shrink-0 text-accent-500" />
              <div className="flex flex-col min-w-0">
                <span className="text-pretty text-caption-2-medium font-semibold text-text-primary">全能调度</span>
                <span className="text-pretty font-mono text-caption-2-regular text-text-secondary">多个助手一起用</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3 text-caption-2-medium text-text-tertiary">
          <span>持续开发以解锁下一级勋章</span>
          <RiCheckDoubleLine className="size-3.5 text-accent-500" />
        </div>
      </div>
    </div>
  )
}
