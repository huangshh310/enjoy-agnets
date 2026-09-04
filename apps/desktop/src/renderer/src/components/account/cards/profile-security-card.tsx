/**
 * 底栏安全卡片：只展示 renderer 可见的 hasKey，以及本机节点，不编造 IP / DPAPI 状态。
 */
import { RiComputerLine, RiShieldCheckLine, RiShieldLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import type { ExtendedUserProfile } from "../types/profile.types"

interface ProfileSecurityCardProps {
  profile: ExtendedUserProfile
}

export function ProfileSecurityCard({ profile }: ProfileSecurityCardProps) {
  const hasKey = useChatStore((state) => state.hasKey)
  const protectedVault = hasKey || profile.safeStorageActive

  return (
    <div className="flex select-none flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <h3 className="text-caption-1-medium text-text-primary">凭据加密与硬件安全</h3>
        <span
          className={cx(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-caption-2-medium",
            protectedVault
              ? "bg-accent-500/10 text-accent-600"
              : "bg-background-secondary-default text-text-tertiary"
          )}
        >
          <span
            className={cx(
              "size-1.5 rounded-full",
              protectedVault ? "bg-accent-500" : "bg-text-tertiary"
            )}
          />
          {protectedVault ? "密钥已托管" : "未写入密钥"}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-separator-border/60 bg-background-secondary-default/40 p-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-secondary">
          {protectedVault ? (
            <RiShieldCheckLine className="size-5 text-accent-500" />
          ) : (
            <RiShieldLine className="size-5" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-caption-1-medium text-text-primary">主进程 vault · 不见明文</span>
          <span className="text-caption-2-medium text-text-tertiary">
            renderer 只读 hasKey / keyHint。供应商密钥由主进程 vault 保管，不在此页探测 OS 加密接口。
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-separator-border/50 pt-2">
        <span className="text-caption-2-medium text-text-tertiary">当前终端节点</span>
        {profile.activeDevices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between rounded-xl border border-separator-border/60 bg-background-secondary-default/30 p-3"
          >
            <div className="flex items-center gap-3">
              <RiComputerLine className="size-4 shrink-0 text-accent-500" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-caption-1-medium text-text-primary">{device.name}</span>
                  {device.isCurrent ? (
                    <span className="rounded bg-accent-500/10 px-1.5 font-mono text-caption-2-medium text-accent-500">
                      当前终端
                    </span>
                  ) : null}
                </div>
                <span className="font-mono text-caption-2-medium text-text-tertiary">
                  {device.os}
                  {device.ip ? ` · ${device.ip}` : ""}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
