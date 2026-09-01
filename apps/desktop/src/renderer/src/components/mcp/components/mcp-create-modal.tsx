/**
 * MCP Server 注册与编辑弹窗组件：
 * 采用专业 IDE 表单设计，支持环境变量、预设模版快速套用及安全白名单设置。
 */
import { useEffect, useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiKey2Line,
  RiLoader4Line,
  RiShieldCheckLine,
  RiSparklingLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import type { McpServer, McpTransport } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { FEATURED_MCP_PRESETS } from "../constants/mcp-presets"

export function McpCreateModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialServer?: McpServer | null
  onChanged: () => Promise<void>
}) {
  const { open, onOpenChange, initialServer, onChanged } = props

  const [name, setName] = useState("local-server")
  const [transport, setTransport] = useState<McpTransport>("stdio")
  const [command, setCommand] = useState("npx -y @modelcontextprotocol/server-everything")
  const [url, setUrl] = useState("https://mcp.example.com/sse")
  const [trusted, setTrusted] = useState(false)
  const [allowedResourceUrisText, setAllowedResourceUrisText] = useState("")
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 当 initialServer 变化时填充表单
  useEffect(() => {
    if (initialServer) {
      setName(initialServer.name)
      setTransport(initialServer.transport)
      setCommand(initialServer.command ?? "")
      setUrl(initialServer.url ?? "")
      setTrusted(initialServer.trusted)
      setAllowedResourceUrisText((initialServer.allowedResourceUris ?? []).join(", "))
      if (initialServer.envRef) {
        try {
          const parsed = JSON.parse(initialServer.envRef) as Record<string, string>
          setEnvPairs(Object.entries(parsed).map(([key, value]) => ({ key, value })))
        } catch {
          setEnvPairs([])
        }
      } else {
        setEnvPairs([])
      }
    } else {
      setName("local-server")
      setTransport("stdio")
      setCommand("npx -y @modelcontextprotocol/server-everything")
      setUrl("https://mcp.example.com/sse")
      setTrusted(false)
      setAllowedResourceUrisText("")
      setEnvPairs([])
    }
    setErrorMsg(null)
  }, [initialServer, open])

  function handleSelectPreset(presetId: string) {
    const p = FEATURED_MCP_PRESETS.find((item) => item.id === presetId)
    if (!p) return
    setName(p.id)
    setTransport(p.transport)
    if (p.command) setCommand(p.command)
    if (p.url) setUrl(p.url)
    if (p.envTemplates) {
      setEnvPairs(p.envTemplates.map((t) => ({ key: t.key, value: "" })))
    } else {
      setEnvPairs([])
    }
  }

  function handleAddEnv() {
    setEnvPairs((prev) => [...prev, { key: "", value: "" }])
  }

  function handleRemoveEnv(index: number) {
    setEnvPairs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleEnvChange(index: number, field: "key" | "value", val: string) {
    setEnvPairs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setErrorMsg("请输入 Server Identifier")
      return
    }
    if (transport === "stdio" && !command.trim()) {
      setErrorMsg("请输入执行 Command 命令")
      return
    }
    if ((transport === "sse" || transport === "http") && !url.trim()) {
      setErrorMsg("请输入服务端 URL 端点")
      return
    }

    setIsSaving(true)
    setErrorMsg(null)
    try {
      let envRef: string | undefined = undefined
      const validEnv = envPairs.filter((p) => p.key.trim() !== "")
      if (validEnv.length > 0) {
        const envObj: Record<string, string> = {}
        for (const pair of validEnv) {
          envObj[pair.key.trim()] = pair.value
        }
        envRef = JSON.stringify(envObj)
      }

      const allowedResourceUris = allowedResourceUrisText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      await getIde().mcp.upsert({
        id: initialServer?.id,
        name: name.trim(),
        transport,
        command: transport === "stdio" ? command.trim() : undefined,
        url: transport === "stdio" ? undefined : url.trim(),
        envRef,
        allowedResourceUris,
        modelVisibleTools: initialServer?.modelVisibleTools ?? [],
        appOnlyTools: initialServer?.appOnlyTools ?? [],
        trusted
      })

      await onChanged()
      onOpenChange(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "保存 MCP Server 失败")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-xl border border-separator-border/80 bg-background-primary-default shadow-xl">
        {/* 标题栏 */}
        <div className="border-b border-separator-border/70 px-5 py-3.5 flex flex-col gap-0.5">
          <DialogTitle className="text-body-medium font-semibold text-text-primary">
            {initialServer ? "编辑 MCP Server 配置" : "注册新 MCP Server"}
          </DialogTitle>
          <p className="text-[11.5px] text-text-tertiary">
            配置 stdio 进程或 SSE/HTTP 远程端点，主进程将以安全沙箱方式调度。
          </p>
        </div>

        <div className="flex flex-col gap-4 p-5 max-h-[70vh] overflow-y-auto">
          {/* 预设快捷模版 */}
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
                    onClick={() => handleSelectPreset(preset.id)}
                    className="rounded border border-separator-border/70 bg-background-primary-default px-2 py-0.5 text-[10.5px] text-text-secondary hover:text-text-primary transition-all"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* 表单字段 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">
                Server Identifier (唯一标识)
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如: filesystem, github"
                className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">
                Transport 协议
              </Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5 h-8">
                {(["stdio", "sse", "http"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTransport(t)}
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

          {/* STDIO / URL 输入 */}
          {transport === "stdio" ? (
            <div className="flex flex-col gap-1">
              <Label className="text-[11.5px] font-medium text-text-secondary">
                Command & Arguments (启动命令)
              </Label>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
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
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mcp.example.com/sse"
                className="font-mono text-caption-2-medium h-8 bg-background-secondary-default/40"
              />
            </div>
          )}

          {/* 环境变量配置 */}
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
                onClick={handleAddEnv}
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
                      onChange={(e) => handleEnvChange(idx, "key", e.target.value)}
                      placeholder="KEY"
                      className="font-mono text-caption-2-medium flex-1 h-7.5 bg-background-secondary-default/40"
                    />
                    <Input
                      value={pair.value}
                      type="password"
                      onChange={(e) => handleEnvChange(idx, "value", e.target.value)}
                      placeholder="VALUE"
                      className="font-mono text-caption-2-medium flex-1 h-7.5 bg-background-secondary-default/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEnv(idx)}
                      className="p-1 text-text-tertiary hover:text-rose-500 transition-colors"
                    >
                      <RiDeleteBinLine className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 信任与安全白名单 */}
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
                onChange={(e) => setTrusted(e.target.checked)}
                className="size-4 rounded accent-accent-500 mt-0.5 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1 border-t border-separator-border/40 pt-2">
              <Label className="text-[10.5px] font-medium text-text-tertiary">
                允许的资源 URI 白名单 (逗号分隔，可选)
              </Label>
              <Input
                value={allowedResourceUrisText}
                onChange={(e) => setAllowedResourceUrisText(e.target.value)}
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

        {/* 底部按钮栏 */}
        <div className="flex items-center justify-end gap-2 border-t border-separator-border/70 px-5 py-3 bg-background-secondary-default/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-8 text-caption-2-medium"
          >
            取消
          </Button>

          <Button
            size="sm"
            data-testid="mcp-add-server"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
          >
            {isSaving ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiCheckLine className="size-3" />
            )}
            <span>{initialServer ? "保存更新" : "注册 Server"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
