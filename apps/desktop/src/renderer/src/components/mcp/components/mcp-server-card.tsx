/**
 * 单台 MCP Server 桌面级紧凑卡片：
 * 采用专业 IDE 风格，集成状态指示、延迟测试、Trust 状态切换、工具发现预览与 App 启动。
 */
import { useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiClipboardLine,
  RiCommandLine,
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiGlobalLine,
  RiInformationLine,
  RiKey2Line,
  RiLoader4Line,
  RiPlugLine,
  RiPulseLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiTerminalBoxLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { McpServer } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"

export function McpServerCard(props: {
  server: McpServer
  onChanged: () => Promise<void>
  onOpenApp: (serverId: string) => Promise<void>
  onExploreTools: (server: McpServer) => void
  onEdit: (server: McpServer) => void
}) {
  const { server, onChanged, onOpenApp, onExploreTools, onEdit } = props
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExpandingTools, setIsExpandingTools] = useState(false)

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleToggleConnect() {
    setIsConnecting(true)
    try {
      if (server.connected) {
        await getIde().mcp.disconnect(server.id)
      } else {
        await getIde().mcp.connect(server.id)
      }
      await onChanged()
    } catch {
      // 保持当前状态
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = (await getIde().mcp.test(server.id)) as { ok: boolean; message?: string }
      setTestResult(res.ok ? t("pages.mcp.pingOk") : (res.message ?? t("pages.mcp.pingFailed")))
    } catch (err: unknown) {
      setTestResult(err instanceof Error ? err.message : t("pages.mcp.testFailed"))
    } finally {
      setIsTesting(false)
      setTimeout(() => setTestResult(null), 3500)
    }
  }

  async function handleToggleTrust() {
    await getIde().mcp.upsert({
      id: server.id,
      name: server.name,
      transport: server.transport,
      command: server.command,
      url: server.url,
      envRef: server.envRef,
      allowedResourceUris: server.allowedResourceUris,
      modelVisibleTools: server.modelVisibleTools,
      appOnlyTools: server.appOnlyTools,
      trusted: !server.trusted
    })
    await onChanged()
  }

  async function handleDelete() {
    await getIde().mcp.remove(server.id)
    await onChanged()
  }

  const endpointText = server.transport === "stdio" ? server.command : server.url
  const tools = server.tools ?? []

  return (
    <article
      className={cx(
        "group relative flex flex-col justify-between rounded-xl border p-4 transition-all",
        server.connected
          ? "border-separator-border/80 bg-background-primary-default shadow-xs hover:border-separator-border"
          : "border-separator-border/50 bg-background-secondary-default/25 opacity-90"
      )}
    >
      {/* 头部：协议图标、名称、运行状态与工具栏 */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border/50 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cx(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs",
              server.connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-separator-border bg-background-secondary-default text-text-tertiary"
            )}
          >
            {server.transport === "stdio" ? (
              <RiTerminalBoxLine className="size-4" />
            ) : (
              <RiGlobalLine className="size-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="truncate text-body-medium font-semibold text-text-primary">
                {server.name}
              </h4>
              <TransportBadge transport={server.transport} />
              <ConnectionBadge connected={server.connected} isConnecting={isConnecting} />
              <TrustBadge trusted={server.trusted} />
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-tertiary">
              <span>id: {server.id.slice(0, 14)}</span>
              {server.envRef ? (
                <span className="inline-flex items-center gap-1 text-text-secondary">
                  <RiKey2Line className="size-3 text-amber-500" />
                  <span>{t("pages.mcp.envBadge")}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 顶部紧凑操作工具栏 */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Trust / Untrust 切换 */}
          <Button
            size="sm"
            variant="outline"
            className={cx(
              "gap-1 h-7 px-2.5 text-caption-2-medium",
              server.trusted ? "text-text-secondary" : "text-text-primary font-medium"
            )}
            onClick={() => void handleToggleTrust()}
          >
            {server.trusted ? (
              <>
                <RiShieldLine className="size-3 text-text-tertiary" />
                <span>{t("pages.mcp.untrust")}</span>
              </>
            ) : (
              <>
                <RiShieldCheckLine className="size-3 text-emerald-500" />
                <span>{t("pages.mcp.trust")}</span>
              </>
            )}
          </Button>

          {/* Open App 按钮（仅受信任服务且支持时展示） */}
          {server.trusted ? (
            <Button
              size="sm"
              variant="outline"
              data-testid="mcp-open-app"
              className="gap-1 h-7 px-2.5 text-caption-2-medium text-accent-600 dark:text-accent-400"
              onClick={() => void onOpenApp(server.id)}
            >
              <RiExternalLinkLine className="size-3" />
              <span>{t("pages.mcp.openApp")}</span>
            </Button>
          ) : null}

          {/* 连接/断开 */}
          <Button
            size="sm"
            variant="outline"
            disabled={isConnecting}
            className="gap-1 h-7 px-2.5 text-caption-2-medium"
            onClick={() => void handleToggleConnect()}
          >
            {isConnecting ? (
              <RiLoader4Line className="size-3 animate-spin text-accent-500" />
            ) : (
              <RiPlugLine className="size-3" />
            )}
            <span>{server.connected ? t("pages.mcp.disconnect") : t("pages.mcp.connectAction")}</span>
          </Button>

          {/* Ping 测试 */}
          <Button
            size="sm"
            variant="ghost"
            disabled={isTesting}
            className="gap-1 h-7 px-2 text-caption-2-medium text-text-secondary"
            onClick={() => void handleTest()}
          >
            {isTesting ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiPulseLine className="size-3" />
            )}
            <span>{testResult || t("pages.mcp.ping")}</span>
          </Button>

          {/* 编辑 */}
          <Button
            size="icon-sm"
            variant="ghost"
            title={t("pages.mcp.editConfig")}
            className="size-7 text-text-tertiary hover:text-text-primary"
            onClick={() => onEdit(server)}
          >
            <RiEditLine className="size-3.5" />
          </Button>

          {/* 删除 */}
          <Button
            size="icon-sm"
            variant="ghost"
            title={t("pages.mcp.deleteServer")}
            className="size-7 text-text-tertiary hover:text-rose-500"
            onClick={() => void handleDelete()}
          >
            <RiDeleteBinLine className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 命令/端点展示条（紧凑暗调） */}
      {endpointText ? (
        <div className="mt-2.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/50 px-2.5 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 font-mono text-[11.5px] text-text-secondary truncate">
            <RiCommandLine className="size-3 shrink-0 text-text-tertiary" />
            <span className="truncate">{endpointText}</span>
          </div>

          <button
            type="button"
            title={t("pages.mcp.copyEndpoint")}
            onClick={() => handleCopy(endpointText)}
            className="inline-flex items-center rounded p-1 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
          >
            {copied ? (
              <RiCheckLine className="size-3 text-emerald-500" />
            ) : (
              <RiClipboardLine className="size-3" />
            )}
          </button>
        </div>
      ) : null}

      {/* 错误提示 */}
      {server.error ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 text-[11px] text-rose-600 dark:text-rose-400">
          <RiInformationLine className="size-3.5 shrink-0" />
          <span className="truncate">{server.error}</span>
        </div>
      ) : null}

      {/* 底部工具发现与探索行 */}
      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-separator-border/40 text-caption-2-medium">
        <div className="flex items-center gap-3 text-text-tertiary">
          <button
            type="button"
            onClick={() => setIsExpandingTools((prev) => !prev)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors font-medium text-[11.5px]"
          >
            <RiToolsLine className="size-3 text-accent-500" />
            <span>{t("pages.mcp.toolsCount", { n: tools.length })}</span>
            {tools.length > 0 ? (
              isExpandingTools ? (
                <RiArrowDownSLine className="size-3" />
              ) : (
                <RiArrowRightSLine className="size-3" />
              )
            ) : null}
          </button>

          {server.allowedResourceUris.length > 0 ? (
            <span className="text-[11px] font-mono">
              {t("pages.mcp.urisCount", { n: server.allowedResourceUris.length })}
            </span>
          ) : null}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onExploreTools(server)}
          className="gap-1 h-6 px-2 text-[11px] text-text-secondary hover:text-text-primary"
        >
          <span>{t("pages.mcp.toolsPermission")}</span>
          <RiArrowRightSLine className="size-3" />
        </Button>
      </div>

      {/* 内联折叠展开的工具简略列表 */}
      {isExpandingTools && tools.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-1 rounded-lg border border-separator-border/60 bg-background-secondary-default/30 p-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between gap-2 rounded border border-separator-border/30 bg-background-primary-default px-2 py-1 text-[11px]"
              >
                <span className="font-mono font-medium text-text-primary truncate">
                  {tool.name}
                </span>
                <span className="text-text-tertiary text-[10px] truncate max-w-[150px]">
                  {tool.description || t("pages.mcp.noDescription")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

function TransportBadge({ transport }: { transport: McpServer["transport"] }) {
  return (
    <span
      className={cx(
        "rounded px-1.5 py-0.5 text-[9.5px] font-mono font-medium uppercase",
        transport === "stdio"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : transport === "sse"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      {transport}
    </span>
  )
}

function ConnectionBadge({
  connected,
  isConnecting
}: {
  connected: boolean
  isConnecting?: boolean
}) {
  const t = useT()
  if (isConnecting) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <RiLoader4Line className="size-2.5 animate-spin" />
        {t("pages.mcp.connecting")}
      </span>
    )
  }

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-medium",
        connected
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-background-secondary-default text-text-tertiary"
      )}
    >
      <span
        className={cx(
          "size-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-text-tertiary"
        )}
      />
      {connected ? t("pages.mcp.connected") : t("pages.mcp.disconnected")}
    </span>
  )
}

function TrustBadge({ trusted }: { trusted: boolean }) {
  const t = useT()
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-medium",
        trusted
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      <RiShieldCheckLine className="size-2.5" />
      {trusted ? t("pages.mcp.trusted") : t("pages.mcp.untrusted")}
    </span>
  )
}
