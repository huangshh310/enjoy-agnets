/**
 * 个人开发者名片与战报海报弹窗：
 * 展示 Enjoy Agents 开发者战报卡片，支持一键复制分享摘要文案。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiComputerLine,
  RiCpuLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiSparklingLine
} from "@remixicon/react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BlobatarAvatar } from "../../avatar/blobatar-avatar"
import type { ExtendedUserProfile } from "../types/profile.types"

interface ProfileSharePosterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ExtendedUserProfile
  activeEngineLabel?: string
  activeModelLabel?: string
}

export function ProfileSharePosterDialog({
  open,
  onOpenChange,
  profile,
  activeEngineLabel = "Enjoy Local",
  activeModelLabel
}: ProfileSharePosterDialogProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyShareText() {
    const summary = [
      `🤖 Enjoy Agents · 开发者个人战报`,
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `👨‍💻 开发者: ${profile.name} (${profile.handle || "@developer"})`,
      `🏷️ 头衔: ${profile.roleTitle || "全栈智能工程师"}`,
      `⚡ 主力引擎: ${activeEngineLabel}`,
      activeModelLabel ? `🧠 核心模型: ${activeModelLabel}` : null,
      `🛡️ 安全边界: 严格本地沙箱 (Local Hardware Jailed)`,
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `Enjoy Agents — 本地优先的自主智能体开发平台`
    ]
      .filter(Boolean)
      .join("\n")

    void navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border border-separator-border bg-background-primary-default p-0 shadow-2xl sm:rounded-2xl select-none">
        <DialogHeader className="border-b border-separator-border/60 px-5 pt-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-title-3-semibold text-text-primary">
            <RiSparklingLine className="size-4.5 text-accent-500" />
            <span>开发者战报海报</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 flex flex-col items-center">
          {/* 海报卡片 */}
          <div className="w-full rounded-2xl border border-separator-border/80 bg-linear-to-b from-background-secondary-default/80 via-background-primary-default to-background-secondary-default/50 p-5 shadow-card flex flex-col gap-4">
            {/* 顶部品牌 */}
            <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
              <span className="font-mono text-caption-2-bold font-bold tracking-wider text-accent-600 dark:text-accent-400 uppercase">
                Enjoy Agents · Dev Profile
              </span>
              <span className="rounded-full bg-state-success-text/10 px-2 py-0.5 font-mono text-caption-2-semibold font-semibold text-state-success-text dark:text-state-success-text">
                VERIFIED AGENT IDE
              </span>
            </div>

            {/* 个人身份区 */}
            <div className="flex items-center gap-3.5">
              <div className="size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-500/30 p-0.5 bg-background-primary-default">
                <BlobatarAvatar config={profile.blobatarConfig} size={52} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-title-3-semibold text-text-primary truncate">{profile.name}</span>
                  {profile.badgeText ? (
                    <span className="rounded bg-accent-500/10 px-1.5 py-0.2 text-caption-2-semibold font-semibold text-accent-600 dark:text-accent-400">
                      {profile.badgeText}
                    </span>
                  ) : null}
                </div>
                <span className="font-mono text-caption-2-medium text-text-tertiary">
                  {profile.handle || "@developer"}
                  {profile.roleTitle ? ` · ${profile.roleTitle}` : ""}
                </span>
              </div>
            </div>

            {/* 核心指标九宫格 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col rounded-xl border border-border-button-default/80 bg-background-primary-default/80 p-2.5">
                <div className="flex items-center gap-1.5 text-text-tertiary text-caption-2-regular">
                  <RiRobot2Line className="size-3 text-accent-500" />
                  <span>自主引擎</span>
                </div>
                <span className="mt-1 font-mono text-caption-1-semibold text-text-primary truncate">
                  {activeEngineLabel}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-border-button-default/80 bg-background-primary-default/80 p-2.5">
                <div className="flex items-center gap-1.5 text-text-tertiary text-caption-2-regular">
                  <RiCpuLine className="size-3 text-accent-500" />
                  <span>主力模型</span>
                </div>
                <span className="mt-1 font-mono text-caption-1-semibold text-text-primary truncate">
                  {activeModelLabel || "Claude / GPT-4o"}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-border-button-default/80 bg-background-primary-default/80 p-2.5">
                <div className="flex items-center gap-1.5 text-text-tertiary text-caption-2-regular">
                  <RiShieldCheckLine className="size-3 text-state-success-text" />
                  <span>安全存储</span>
                </div>
                <span className="mt-1 text-caption-1-semibold text-state-success-text dark:text-state-success-text">
                  硬件 Key 隔离
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-border-button-default/80 bg-background-primary-default/80 p-2.5">
                <div className="flex items-center gap-1.5 text-text-tertiary text-caption-2-regular">
                  <RiComputerLine className="size-3 text-accent-500" />
                  <span>运行环境</span>
                </div>
                <span className="mt-1 text-caption-1-semibold text-text-primary">
                  Local Desktop
                </span>
              </div>
            </div>

            {/* 底部注脚 */}
            <div className="pt-2 text-center text-caption-2-regular font-mono text-text-tertiary">
              Built with Enjoy Agents · Local-First Autonomous AI IDE
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-separator-border/60 bg-background-secondary-default/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyShareText}
            className="gap-1.5 text-caption-2-medium cursor-pointer"
          >
            {copied ? (
              <>
                <RiCheckLine className="size-3.5 text-state-success-text" />
                <span>已复制战报</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3.5" />
                <span>复制分享文本</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-caption-2-medium cursor-pointer shadow-xs"
          >
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
