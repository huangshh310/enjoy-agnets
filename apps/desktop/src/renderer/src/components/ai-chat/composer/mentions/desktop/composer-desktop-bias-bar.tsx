/**
 * 输入下偏置芯片：Execute 才算已连接；Explore 只出口头诚实，不装已连接。
 */
import { useMemo } from "react"
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import { surfaceForMode } from "../../composer-mode"
import { readDesktopMentionBias } from "./read-desktop-mention-bias.ts"

export function ComposerDesktopBiasBar({
  value,
  apps
}: {
  value: string
  apps: readonly DesktopMentionApp[]
}) {
  const t = useT()
  const mode = useChatStore((state) => state.mode)
  const bias = useMemo(() => readDesktopMentionBias(value, apps), [value, apps])
  if (!bias) return null

  const execute = surfaceForMode(mode) === "execute"
  const label = bias.kind === "host" ? t("chat.desktopBiasHost") : bias.displayName
  const caption =
    bias.kind === "host"
      ? t("chat.desktopBiasHostHint")
      : isDevCopyEnabled() && bias.appKey
        ? t("chat.desktopBiasAppKey", { key: bias.appKey })
        : bias.appKey
          ? ""
          : t("chat.mentionDesktopAlwaysHidden")

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-1">
      <span
        data-testid="desktop-bias-chip"
        data-connected={execute ? "true" : "false"}
        data-bias={bias.kind}
        className={cx(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-2-semibold ring-1",
          execute
            ? "bg-accent-500/10 text-accent-600 ring-accent-500/25"
            : "bg-background-secondary-default text-text-tertiary/60 ring-border-button-default line-through"
        )}
      >
        🖥 {label}
      </span>
      {execute && !caption ? null : (
        <span
          data-testid={execute ? "desktop-bias-caption" : "desktop-bias-explore-honesty"}
          className="text-caption-2-medium text-text-tertiary"
        >
          {execute ? caption : t("chat.desktopBiasExploreHonesty")}
        </span>
      )}
    </div>
  )
}
