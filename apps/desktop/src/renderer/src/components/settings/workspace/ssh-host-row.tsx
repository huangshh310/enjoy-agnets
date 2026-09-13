/**
 * 远程连接名册一行：现代服务器节点卡片（探测 / 编辑 / 删除 / 定位文件）。
 */
import { useState } from "react"
import {
  RiAlertLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiEditLine,
  RiExternalLinkLine,
  RiKey2Line,
  RiLoader4Line,
  RiRadarLine,
  RiServerLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import type { SshHost } from "@enjoy-agents/ipc-contract"

export function SshHostRow({
  host,
  busy,
  onProbe,
  onEdit,
  onRemove,
  onOpenKey
}: {
  host: SshHost
  busy: boolean
  onProbe: () => Promise<{ ok: boolean; error?: string }>
  onEdit: () => void
  onRemove: () => void
  onOpenKey?: () => void
}) {
  const t = useT()
  const [probeStatus, setProbeStatus] = useState<"idle" | "probing" | "success" | "failed">("idle")
  const [probeMessage, setProbeMessage] = useState<string | null>(null)

  const endpoint =
    host.source === "wsl" ? `WSL · ${host.host}` : `${host.user}@${host.host}:${host.port}`
  const sourceLabel =
    host.source === "wsl" ? "WSL" : host.source === "ssh_config" ? "SSH Config" : t("settings.workspace.sshManual")

  const keyBasename = host.keyPath ? host.keyPath.split("/").pop() || host.keyPath : null

  async function handleProbe() {
    setProbeStatus("probing")
    setProbeMessage(null)
    try {
      const res = await onProbe()
      if (res?.ok) {
        setProbeStatus("success")
        setProbeMessage(null)
        setTimeout(() => {
          setProbeStatus((prev) => (prev === "success" ? "idle" : prev))
        }, 3500)
      } else {
        setProbeStatus("failed")
        setProbeMessage(res?.error || t("settings.workspace.sshFailed"))
        setTimeout(() => {
          setProbeStatus((prev) => (prev === "failed" ? "idle" : prev))
        }, 8000)
      }
    } catch (err) {
      setProbeStatus("failed")
      setProbeMessage(err instanceof Error ? err.message : String(err))
      setTimeout(() => {
        setProbeStatus((prev) => (prev === "failed" ? "idle" : prev))
      }, 8000)
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border-button-default bg-background-secondary-default/40 hover:bg-background-secondary-default/70 p-3.5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
            <RiServerLine className="size-5" />
          </div>
          <div className="flex flex-col min-w-0 gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-body-medium font-semibold text-text-primary truncate">
                {host.alias}
              </span>
              <span className="rounded-md border border-separator-border bg-background-primary-default px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                {sourceLabel}
              </span>
              <span className="rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-600 dark:text-accent-400">
                {t("settings.workspace.sshProjectCount", { count: host.workspaceCount })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-caption-2-regular text-text-tertiary">
              <span className="font-mono text-text-secondary">{endpoint}</span>
              {keyBasename ? (
                <button
                  type="button"
                  onClick={onOpenKey}
                  title="在系统文件管理器中定位密钥文件"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-text-tertiary hover:text-accent-500 bg-background-primary-default hover:bg-background-secondary-default px-1.5 py-0.5 rounded border border-separator-border/60 transition-colors cursor-pointer"
                >
                  <RiKey2Line className="size-3 text-accent-500" />
                  <span className="truncate max-w-[140px]">{keyBasename}</span>
                  <RiExternalLinkLine className="size-2.5 opacity-60" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={busy || probeStatus === "probing"}
            onClick={() => void handleProbe()}
            className={`h-8 gap-1.5 text-caption-2-medium cursor-pointer transition-colors ${
              probeStatus === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : probeStatus === "failed"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                  : ""
            }`}
          >
            {probeStatus === "probing" ? (
              <RiLoader4Line className="size-3.5 animate-spin text-accent-500" />
            ) : probeStatus === "success" ? (
              <RiCheckLine className="size-3.5 text-emerald-500" />
            ) : probeStatus === "failed" ? (
              <RiAlertLine className="size-3.5 text-rose-500" />
            ) : (
              <RiRadarLine className="size-3.5 text-text-secondary" />
            )}
            <span>
              {probeStatus === "probing"
                ? "探测中…"
                : probeStatus === "success"
                  ? "连通正常"
                  : probeStatus === "failed"
                    ? "连接失败"
                    : t("settings.workspace.sshProbe")}
            </span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={busy}
            onClick={onEdit}
            className="h-8 gap-1.5 text-caption-2-medium cursor-pointer"
          >
            <RiEditLine className="size-3.5 text-text-secondary" />
            <span>编辑</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="h-8 gap-1.5 text-caption-2-medium text-text-tertiary hover:text-state-danger-text hover:bg-state-danger-text/10 cursor-pointer"
          >
            <RiDeleteBinLine className="size-3.5" />
            <span>{t("settings.workspace.sshRemoveHost")}</span>
          </Button>
        </div>
      </div>

      {/* ─── 探测状态反馈条 ────────────────────────────────────── */}
      {probeStatus === "success" ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <RiCheckLine className="size-3.5 shrink-0 text-emerald-500" />
          <span>网络连通正常，SSH 握手与端口访问成功。</span>
        </div>
      ) : probeStatus === "failed" && probeMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-[11px] text-rose-600 dark:text-rose-400">
          <RiAlertLine className="size-3.5 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-semibold">探测失败</span>
            <span className="font-mono text-[10.5px] break-all leading-normal opacity-90">
              {probeMessage}
            </span>
          </div>
        </div>
      ) : null}
    </li>
  )
}
