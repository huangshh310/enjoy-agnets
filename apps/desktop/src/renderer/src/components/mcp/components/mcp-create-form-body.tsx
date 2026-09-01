/**
 * MCP 注册/编辑表单字段：模版、协议、环境变量、信任白名单。
 */
import {
  RiAddLine,
  RiDeleteBinLine,
  RiKey2Line,
  RiShieldCheckLine,
  RiSparklingLine
} from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { McpServer, McpTransport } from "@enjoy-agents/ipc-contract"
import { FEATURED_MCP_PRESETS } from "../constants/mcp-presets"

export type McpEnvPair = { key: string; value: string }

export function McpCreateFormBody(props: {
  initialServer?: McpServer | null
  name: string
  onNameChange: (value: string) => void
  transport: McpTransport
  onTransportChange: (value: McpTransport) => void
  command: string
  onCommandChange: (value: string) => void
  url: string
  onUrlChange: (value: string) => void
  trusted: boolean
  onTrustedChange: (value: boolean) => void
  allowedResourceUrisText: string
  onAllowedResourceUrisChange: (value: string) => void
  envPairs: McpEnvPair[]
  onSelectPreset: (presetId: string) => void
  onAddEnv: () => void
  onRemoveEnv: (index: number) => void
  onEnvChange: (index: number, field: "key" | "value", val: string) => void
  errorMsg: string | null
}) {
  const {
    initialServer,
    name,
    onNameChange,
    transport,
    onTransportChange,
    command,
    onCommandChange,
    url,
    onUrlChange,
    trusted,
    onTrustedChange,
    allowedResourceUrisText,
    onAllowedResourceUrisChange,
    envPairs,
    onSelectPreset,
    onAddEnv,
    onRemoveEnv,
    onEnvChange,
    errorMsg
  } = props

  return (
    <div className="flex flex-col gap-4 p-5 max-h-[70vh] overflow-y-auto">
      {!initialServer ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-separator-border/50 bg-background-secondary-default/30 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
            <RiSparklingLine className="size-3.5 text-accent-500" />
            <span>从常用模版填入：</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FEATURED_MCP_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className="rounded border border-separator-border/70 bg-background-primary-default px-2 py-0.5 text-[10.5px] text-text-secondary hover:text-text-primary transition-all"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-[11.5px] font-medium text-text-secondary">
            Server Identifier (唯一标识)
          </Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="例如: filesystem, github"
            className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-[11.5px] font-medium text-text-secondary">Transport 协议</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5 h-8">
            {(["stdio", "sse", "http"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTransportChange(t)}
                className={cx(
                  "rounded text-[11px] font-mono uppercase transition-all flex items-center justify-center",
                  transport === t
                    ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {transport === "stdio" ? (
        <div className="flex flex-col gap-1">
          <Label className="text-[11.5px] font-medium text-text-secondary">
            Command & Arguments (启动命令)
          </Label>
          <Input
            value={command}
            onChange={(e) => onCommandChange(e.target.value)}
            placeholder="npx -y @modelcontextprotocol/server-filesystem ."
            className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
          />
          <span className="text-[10.5px] text-text-tertiary">
            支持 npx, uvx, node, python 等裸二进制命令。
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Label className="text-[11.5px] font-medium text-text-secondary">
            Endpoint URL (服务地址)
          </Label>
          <Input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://mcp.example.com/sse"
            className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiKey2Line className="size-3 text-amber-500" />
            <Label className="text-[11.5px] font-medium text-text-secondary">
              环境变量 (Env Variables)
            </Label>
          </div>
          <button
            type="button"
            onClick={onAddEnv}
            className="inline-flex items-center gap-0.5 text-[11px] text-text-secondary hover:text-text-primary"
          >
            <RiAddLine className="size-3" />
            <span>添加变量</span>
          </button>
        </div>

        {envPairs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-separator-border/70 p-2.5 text-center text-[11px] text-text-tertiary">
            未配置自定义环境变量（如需配置 API Token 或路径请点击添加）。
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {envPairs.map((pair, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={pair.key}
                  onChange={(e) => onEnvChange(idx, "key", e.target.value)}
                  placeholder="KEY"
                  className="font-mono text-caption-2-medium flex-1 h-7.5 bg-background-secondary-default/40"
                />
                <Input
                  value={pair.value}
                  type="password"
                  onChange={(e) => onEnvChange(idx, "value", e.target.value)}
                  placeholder="VALUE"
                  className="font-mono text-caption-2-medium flex-1 h-7.5 bg-background-secondary-default/40"
                />
                <button
                  type="button"
                  onClick={() => onRemoveEnv(idx)}
                  className="p-1 text-text-tertiary hover:text-rose-500 transition-colors"
                >
                  <RiDeleteBinLine className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11.5px] font-medium text-text-primary">
              <RiShieldCheckLine className="size-3.5 text-emerald-500" />
              <span>信任此 MCP Server (Trusted)</span>
            </div>
            <span className="text-[10.5px] text-text-tertiary">
              信任后允许将 Tools 自动挂载至 Agent 对话，并支持启动沙箱 App。
            </span>
          </div>
          <input
            type="checkbox"
            checked={trusted}
            onChange={(e) => onTrustedChange(e.target.checked)}
            className="size-4 rounded accent-accent-500 mt-0.5 cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 border-t border-separator-border/40 pt-2">
          <Label className="text-[10.5px] font-medium text-text-tertiary">
            允许的资源 URI 白名单 (逗号分隔，可选)
          </Label>
          <Input
            value={allowedResourceUrisText}
            onChange={(e) => onAllowedResourceUrisChange(e.target.value)}
            placeholder="file:///workspace, postgres://localhost/db"
            className="font-mono text-caption-2-medium h-7.5 bg-background-primary-default"
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-[11px] text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      ) : null}
    </div>
  )
}
