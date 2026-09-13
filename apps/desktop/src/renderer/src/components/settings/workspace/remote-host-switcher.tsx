/**
 * 远程服务与主机快速切换器：
 * 支持在顶栏查看当前连接详情、快速切换其他已保存远程服务器/工作区，以及直达远程管理。
 */
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiFolderLine,
  RiHardDrive2Line,
  RiKeyLine,
  RiLockPasswordLine,
  RiPulseLine,
  RiServerLine
} from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { SshHost } from "@enjoy-agents/ipc-contract"
import type { WorkspaceRow } from "@renderer/hooks/workspace-row"
import { loadWorkspace } from "@renderer/hooks/use-agent-session"

export function RemoteHostSwitcher({
  currentEndpoint,
  currentStatus,
  currentWorkspaceId
}: {
  currentEndpoint: string
  currentStatus: "idle" | "connecting" | "connected" | "failed" | "disconnected" | null
  currentWorkspaceId: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const hostsQuery = useQuery({
    queryKey: ["ssh-hosts"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.sshHosts.list() as Promise<SshHost[]>
  })

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })

  const hosts = hostsQuery.data ?? []
  const workspaces = workspacesQuery.data ?? []
  const sshWorkspaces = workspaces.filter((ws) => ws.kind === "ssh")

  // 判断是否为当前主机
  function isHostActive(host: SshHost): boolean {
    if (!currentEndpoint) return false
    const endpoint = `${host.user}@${host.host}`
    return (
      currentEndpoint.includes(host.host) ||
      currentEndpoint.startsWith(endpoint) ||
      (Boolean(host.alias) && currentEndpoint.includes(host.alias))
    )
  }

  // 切换到目标主机的对应工作区
  async function handleSelectHost(host: SshHost) {
    if (!hasIde()) return
    // 找到该主机已登记的第一个工作区
    const targetWorkspace = sshWorkspaces.find(
      (ws) =>
        ws.sshHost === host.host ||
        ws.rootPath.includes(host.host) ||
        (host.workspaces?.length && ws.id === host.workspaces[0]?.id)
    )

    if (targetWorkspace) {
      if (targetWorkspace.id === currentWorkspaceId) {
        setOpen(false)
        return
      }
      setSwitching(host.id)
      try {
        await loadWorkspace(targetWorkspace)
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      } finally {
        setSwitching(null)
        setOpen(false)
      }
    } else {
      // 若该主机尚无工作区，直达工作区设置页进行连接管理
      setOpen(false)
      void navigate({
        to: "/settings/$section",
        params: { section: "workspace" }
      })
    }
  }

  const isConnected = currentStatus === "connected"
  const isConnecting = currentStatus === "connecting"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-caption-1-medium text-text-primary shadow-2xs transition-colors cursor-pointer select-none ${
            isConnected
              ? "border-emerald-500/30 bg-background-primary-default/95 hover:bg-background-primary-default hover:border-emerald-500/60"
              : "border-border-button-default bg-background-primary-default hover:bg-background-secondary-hover hover:border-accent-500/40"
          }`}
          title="点击切换或管理远程服务主机"
        >
          <RiServerLine className="size-3.5 text-accent-600 shrink-0" />
          <span className="truncate max-w-[220px] font-medium">{currentEndpoint || "SSH Remote"}</span>
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              isConnected
                ? "bg-notification-success-foreground"
                : isConnecting
                  ? "bg-accent-500 animate-pulse"
                  : "bg-text-tertiary"
            }`}
          />
          <RiArrowDownSLine
            className={`size-3 text-text-tertiary transition-transform duration-200 ${
              open ? "rotate-180 text-text-primary" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-80 p-3 rounded-2xl shadow-xl border border-border-button-default">
        {/* 头部 */}
        <div className="flex items-center justify-between pb-2 border-b border-separator-border/60">
          <div className="flex items-center gap-1.5">
            <RiHardDrive2Line className="size-4 text-accent-600" />
            <span className="text-body-medium font-semibold text-text-primary">
              {t("settings.workspace.remoteHostsTitle")}
            </span>
          </div>
          <span className="rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-2-medium text-text-tertiary">
            {hosts.length} 主机
          </span>
        </div>

        {/* 当前活跃主机卡片 */}
        <div className="mt-2.5">
          <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider">
            {t("settings.workspace.remoteActiveHost")}
          </span>
          <div className="mt-1 flex items-center justify-between rounded-xl border border-accent-500/35 bg-accent-500/5 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-caption-1-medium font-medium text-text-primary">
                  {currentEndpoint}
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary">
                {isConnected ? "运行中 · 延迟正常" : isConnecting ? "正在握手连接..." : "连接异常"}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-notification-success-foreground/10 px-2 py-0.5 text-caption-2-medium text-notification-success-foreground">
              <RiPulseLine className="size-3" />
              <span>当前</span>
            </span>
          </div>
        </div>

        {/* 其他保存的远程主机列表 */}
        {hosts.length > 0 ? (
          <div className="mt-3">
            <span className="text-caption-2-medium text-text-tertiary uppercase tracking-wider">
              {t("settings.workspace.remoteOtherHosts")}
            </span>
            <div className="mt-1 max-h-44 space-y-1 overflow-y-auto pr-0.5">
              {hosts.map((host) => {
                const active = isHostActive(host)
                const hostWs = sshWorkspaces.filter(
                  (ws) => ws.sshHost === host.host || ws.rootPath.includes(host.host)
                )
                return (
                  <button
                    key={host.id}
                    type="button"
                    onClick={() => void handleSelectHost(host)}
                    disabled={switching === host.id}
                    className={`w-full text-left rounded-xl p-2 transition-colors flex items-center justify-between ${
                      active
                        ? "bg-background-secondary-default/80 ring-1 ring-border-button-default"
                        : "hover:bg-background-secondary-hover"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-caption-1-medium font-medium text-text-primary">
                          {host.alias || `${host.user}@${host.host}`}
                        </span>
                        {active ? <RiCheckLine className="size-3.5 text-accent-600 shrink-0" /> : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-caption-2-regular text-text-tertiary">
                        <span>{host.host}:{host.port}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          {host.auth === "keypath" || host.auth === "agent" ? (
                            <RiKeyLine className="size-3" />
                          ) : (
                            <RiLockPasswordLine className="size-3" />
                          )}
                          <span>{host.auth === "password" ? "密码" : "私钥"}</span>
                        </span>
                        {hostWs.length > 0 ? (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <RiFolderLine className="size-3" />
                              <span>{hostWs.length} 项目</span>
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {!active ? (
                      <span className="shrink-0 text-caption-2-medium text-accent-600">
                        {switching === host.id ? "切换中..." : "切换"}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* 底栏快捷管理操作 */}
        <div className="mt-3 pt-2.5 border-t border-separator-border/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void navigate({ to: "/settings/$section", params: { section: "workspace" } })
            }}
            className="inline-flex items-center gap-1 text-caption-2-medium text-accent-600 hover:underline"
          >
            <span>{t("settings.workspace.remoteManageHosts")}</span>
            <RiExternalLinkLine className="size-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
