/**
 * Settings → MCP：Model Context Protocol 权限与沙箱策略配置。
 * 规范新服务信任级别、只读/写操作审批策略与 Stdio 二进制执行白名单。
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowRightLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { McpIcon } from "../mcp/components/mcp-brand-icons.ts"
import { Button } from "@/components/ui/button"
import { SettingsCard, SettingsRow } from "./settings-row"
import { useT } from "@renderer/i18n"

const STDIO_WHITELIST = ["npx", "npm", "pnpm", "yarn", "bun", "node", "uvx", "uv", "python", "python3"]

export function McpSettings() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── MCP 生态概览看板 ─────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-chart-5/20 bg-chart-5/10 text-chart-5 dark:text-chart-5">
              <McpIcon className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-title-3-semibold text-text-primary">
                  {t("settings.mcp.hubTitle")}
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-tertiary">
                  {t("settings.mcp.hubBadge")}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                {t("settings.mcp.hubDesc")}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/mcp" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <McpIcon className="size-3.5 text-chart-5" />
            <span>{t("settings.mcp.openHub")}</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 安全与工具审批策略 ───────────────────────────── */}
      <SettingsCard title={t("settings.mcp.policies")}>
        <SettingsRow title={t("settings.mcp.untrusted")} description={t("settings.mcp.untrustedDesc")}>
          <span className="inline-flex items-center gap-1 rounded-full border border-state-success-text/20 bg-state-success-text/10 px-2.5 py-0.5 text-caption-2-medium text-state-success-text dark:text-state-success-text">
            <RiShieldCheckLine className="size-3.5" />
            <span>{t("settings.mcp.enforced")}</span>
          </span>
        </SettingsRow>

        <SettingsRow title={t("settings.mcp.whitelist")} description={t("settings.mcp.whitelistDesc")}>
          <div className="flex flex-wrap items-center gap-1 max-w-[320px] justify-end">
            {STDIO_WHITELIST.map((bin) => (
              <span
                key={bin}
                className="font-mono rounded-md border border-border-button-default bg-background-secondary-default px-1.5 py-0.2 text-caption-2-regular text-text-secondary"
              >
                {bin}
              </span>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.mcp.csp")} description={t("settings.mcp.cspDesc")}>
          <span className="font-mono text-caption-2-medium text-text-tertiary">
            connect-src 'none'
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
