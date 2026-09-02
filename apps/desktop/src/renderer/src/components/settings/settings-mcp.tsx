/**
 * Settings → MCP：Model Context Protocol 权限与沙箱策略配置。
 * 规范新服务信任级别、只读/写操作审批策略与 Stdio 二进制执行白名单。
 */
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowRightLine,
  RiPlugLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SettingsCard, SettingsRow } from "./settings-row"

const STDIO_WHITELIST = ["npx", "npm", "pnpm", "yarn", "bun", "node", "uvx", "uv", "python", "python3"]

export function McpSettings() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      {/* ─── MCP 生态概览看板 ─────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <RiPlugLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  Model Context Protocol (MCP) Hub
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  JSON-RPC 2.0
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                Standardized protocol for connecting external tool servers, database query engines, and live app surfaces.
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/mcp" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiPlugLine className="size-3.5 text-purple-500" />
            <span>Open MCP Hub</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 安全与工具审批策略 ───────────────────────────── */}
      <SettingsCard title="Security & Sandboxing Policies">
        <SettingsRow
          title="Untrusted by default"
          description="Newly added MCP servers start in untrusted mode. Tool calls require explicit human confirmation."
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-caption-2-medium text-emerald-600 dark:text-emerald-400">
            <RiShieldCheckLine className="size-3.5" />
            <span>Enforced</span>
          </span>
        </SettingsRow>

        <SettingsRow
          title="Stdio binary whitelist"
          description="Only approved executables can be spawned by stdio servers. Shell wrappers and arbitrary paths are rejected."
        >
          <div className="flex flex-wrap items-center gap-1 max-w-[320px] justify-end">
            {STDIO_WHITELIST.map((bin) => (
              <span
                key={bin}
                className="font-mono rounded-md border border-border-button-default bg-background-secondary-default px-1.5 py-0.2 text-[10px] text-text-secondary"
              >
                {bin}
              </span>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow
          title="Interactive app frame CSP"
          description="Tool UI preview frames are sandboxed with connect-src 'none'. postMessage payloads are sanitized in the main process."
        >
          <span className="font-mono text-caption-2-medium text-text-tertiary">
            connect-src 'none'
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
