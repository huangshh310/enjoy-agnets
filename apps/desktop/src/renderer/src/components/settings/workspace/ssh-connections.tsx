/**
 * 设置页远程连接名册：已存主机 + ssh_config / WSL 发现。
 * 按照 BoardUI 规范重构为高质感卡片与分层表单。
 */
import { useState } from "react"
import {
  RiAddLine,
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiCompass3Line,
  RiDownloadLine,
  RiFileCodeLine,
  RiLoader4Line,
  RiRadarLine,
  RiServerLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { SshHostUpsertInput } from "@enjoy-agents/ipc-contract"
import { SshHostFields } from "./ssh-host-fields"
import { SshHostRow } from "./ssh-host-row"
import { useSshConnections } from "./use-ssh-connections"

export function SshConnections() {
  const model = useSshConnections()
  const t = model.t
  const [probingDraft, setProbingDraft] = useState(false)
  const [draftProbeStatus, setDraftProbeStatus] = useState<"idle" | "probing" | "success" | "failed">("idle")

  async function handleProbeDraft() {
    setProbingDraft(true)
    setDraftProbeStatus("probing")
    try {
      const res = await model.probeDraft()
      if (res?.ok) {
        setDraftProbeStatus("success")
        setTimeout(() => setDraftProbeStatus("idle"), 4000)
      } else {
        setDraftProbeStatus("failed")
      }
    } finally {
      setProbingDraft(false)
    }
  }

  const canSubmit = Boolean(
    !model.busy &&
      !probingDraft &&
      model.draft.host.trim() &&
      model.draft.user.trim()
  )

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      {/* ─── 头部标题与添加触发 ─────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-title-3-semibold text-text-primary">
              {t("settings.workspace.sshConnections")}
            </h3>
            <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400">
              SSH
            </span>
          </div>
          <p className="text-caption-1-regular text-text-tertiary">
            {t("settings.workspace.sshConnectionsDesc")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => void model.openConfigFile()}
            className="h-8 gap-1.5 text-caption-2-medium cursor-pointer"
            title="一键打开系统 ~/.ssh/config 配置文件"
          >
            <RiFileCodeLine className="size-3.5 text-text-secondary" />
            <span>打开配置文件</span>
          </Button>

          <Button
            size="sm"
            variant={model.open && !model.isEditing ? "secondary" : "outline"}
            type="button"
            onClick={() => {
              if (model.open) {
                model.cancelEdit()
              } else {
                model.setOpen(true)
              }
            }}
            className="h-8 gap-1.5 text-caption-2-medium cursor-pointer"
          >
            {model.open ? (
              <>
                <RiCloseLine className="size-3.5" />
                <span>收起表单</span>
              </>
            ) : (
              <>
                <RiAddLine className="size-3.5" />
                <span>{t("settings.workspace.sshAddHost")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── 添加/编辑主机面板（展开态） ───────────────────── */}
      {model.open ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border-button-default bg-background-secondary-default/50 p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-caption-1-semibold text-text-primary">
                {model.isEditing
                  ? `编辑主机 · ${model.draft.alias || model.draft.host}`
                  : t("settings.workspace.sshAddHost")}
              </span>
              <span className="inline-flex items-center gap-1 text-caption-2-regular text-state-success-text dark:text-state-success-text">
                <RiShieldCheckLine className="size-3" />
                <span>仅存名册 · 私钥不入库</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => model.cancelEdit()}
              className="text-text-tertiary hover:text-text-primary p-0.5 rounded cursor-pointer transition-colors"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>

          <SshHostFields value={model.draft} onChange={model.setDraft} />

          {/* 错误告警区 */}
          {model.error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-border-error-default/20 bg-background-tertiary-error/10 p-3 text-caption-1-regular text-text-error-primary dark:text-text-error-primary">
              <RiAlertLine className="size-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold">操作失败</span>
                <span className="font-mono text-caption-2-regular break-all leading-relaxed">
                  {model.error}
                </span>
              </div>
            </div>
          ) : null}

          {/* 测试连接成功提示 */}
          {draftProbeStatus === "success" ? (
            <div className="flex items-center gap-2 rounded-xl border border-state-success-text/20 bg-state-success-text/10 p-3 text-caption-1-regular text-state-success-text dark:text-state-success-text">
              <RiCheckLine className="size-4 shrink-0 text-state-success-text" />
              <span className="font-semibold">测试连接成功：主机网络可达且认证通过</span>
            </div>
          ) : null}

          {/* 底部操作条 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-separator-border/60">
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleProbeDraft()}
              className="h-8 gap-1.5 text-caption-2-medium cursor-pointer"
            >
              {probingDraft ? (
                <RiLoader4Line className="size-3.5 animate-spin text-accent-500" />
              ) : (
                <RiRadarLine className="size-3.5 text-text-secondary" />
              )}
              <span>{probingDraft ? "测试中…" : t("settings.workspace.sshProbe")}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => model.cancelEdit()}
                className="h-8 text-caption-2-medium cursor-pointer"
              >
                取消
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={!canSubmit}
                onClick={() => void model.saveDraft()}
                className="h-8 gap-1.5 text-caption-2-medium font-medium cursor-pointer shadow-xs"
              >
                {model.busy ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
                <span>
                  {model.isEditing ? "更新主机" : t("settings.workspace.sshSaveHost")}
                </span>
              </Button>
            </div>
          </div>
        </div>
      ) : model.error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-border-error-default/20 bg-background-tertiary-error/10 p-3 text-caption-1-regular text-text-error-primary dark:text-text-error-primary">
          <RiAlertLine className="size-4 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-semibold">操作失败</span>
            <span className="font-mono text-caption-2-regular break-all leading-relaxed">
              {model.error}
            </span>
          </div>
        </div>
      ) : null}

      {/* ─── 已保存的主机列表 ───────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-caption-2-medium text-text-tertiary">
            已保存的主机 ({model.hosts.length})
          </span>
        </div>

        {model.hosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-button-default py-8 px-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background-secondary-default text-text-tertiary">
              <RiServerLine className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-secondary">
                {t("settings.workspace.sshNoHosts")}
              </p>
              <p className="text-caption-2-regular text-text-tertiary">
                添加常用开发机后，可直接在侧栏「创建项目」时选择远端工作区。
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {model.hosts.map((host) => (
              <SshHostRow
                key={host.id}
                host={host}
                busy={model.busy}
                onProbe={() => model.probeHost(host.id)}
                onEdit={() => model.startEdit(host)}
                onRemove={() => void model.removeHost(host.id)}
                onOpenKey={
                  host.keyPath ? () => void model.openConfigFile(host.keyPath) : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      {/* ─── 从 ~/.ssh/config 发现的主机 ────────────────────── */}
      <DiscoverList
        t={t}
        discovered={model.discovered}
        onAdd={(item) => void model.addHost(item)}
      />
    </div>
  )
}

function DiscoverList({
  t,
  discovered,
  onAdd
}: {
  t: (path: string) => string
  discovered: Array<{
    alias: string
    host: string
    user?: string
    port?: number
    identityFile?: string
    source?: "manual" | "ssh_config" | "wsl"
  }>
  onAdd: (input: SshHostUpsertInput) => void
}) {
  const rows = discovered.filter((item) => item.user)
  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5 pt-2 border-t border-separator-border">
      <div className="flex items-center gap-1.5">
        <RiCompass3Line className="size-4 text-accent-500" />
        <span className="text-caption-1-medium font-semibold text-text-primary">
          {t("settings.workspace.sshDiscover")}
        </span>
        <span className="rounded bg-background-secondary-default px-1.5 py-0.2 text-caption-2-regular font-mono text-text-tertiary">
          {rows.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((item) => (
          <div
            key={`${item.alias}:${item.host}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border-button-default bg-background-secondary-default/30 p-2.5 hover:bg-background-secondary-default/60 transition-colors"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-caption-1-medium font-medium text-text-primary truncate">
                {item.alias}
              </span>
              <span className="font-mono text-caption-2-regular text-text-tertiary truncate">
                {item.user ? `${item.user}@` : ""}
                {item.host}:{item.port ?? 22}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                onAdd({
                  alias: item.alias,
                  host: item.host,
                  user: item.user ?? "",
                  port: item.port ?? 22,
                  auth: item.identityFile ? "keypath" : "agent",
                  keyPath: item.identityFile,
                  source: item.source ?? "ssh_config"
                })
              }
              className="h-7 gap-1 px-2.5 text-caption-2-regular shrink-0 cursor-pointer"
            >
              <RiDownloadLine className="size-3 text-text-secondary" />
              <span>导入</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

