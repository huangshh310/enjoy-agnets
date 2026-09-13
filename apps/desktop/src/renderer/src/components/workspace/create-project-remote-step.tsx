/**
 * 创建项目第二步（远程）：选已存主机或手填，连接已有远端目录。
 */
import { useState } from "react"
import {
  RiAlertLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFolder6Line,
  RiLoader4Line,
  RiRadarLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { SshHostFields } from "../settings/workspace/ssh-host-fields"
import { CreateProjectHostPicker } from "./create-project-host-picker"
import type { RemoteConnectInput } from "./remote-connect.types"
import { RemoteFolderPicker } from "./remote-folder-picker"
import { useCreateProjectRemote } from "./use-create-project-remote"

export function CreateProjectRemoteStep({
  projectName,
  onNameChange,
  loading,
  error,
  onBack,
  onCancel,
  onConnect
}: {
  projectName: string
  onNameChange: (value: string) => void
  loading: boolean
  error: string | null
  onBack: () => void
  onCancel: () => void
  onConnect: (input: RemoteConnectInput) => void
}) {
  const remote = useCreateProjectRemote(projectName, onConnect)
  const t = remote.t
  const [showSelectedPassword, setShowSelectedPassword] = useState(false)

  const isProbeSuccess = remote.probeNote && remote.probeNote.includes("正常")

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* 项目名称 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium font-medium text-text-secondary">
          {t("pages.workspaces.createProject.nameLabel")}
        </Label>
        <Input
          value={projectName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("pages.workspaces.createProject.namePlaceholder")}
          className="h-9 rounded-xl font-sans text-caption-1-regular"
        />
      </div>

      {/* 远程主机选择 */}
      <CreateProjectHostPicker
        hosts={remote.hosts}
        hostId={remote.hostId}
        onChange={remote.setHostId}
      />

      {/* 添加新主机内嵌卡片 */}
      {remote.usingNew ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-3.5 shadow-2xs">
          <span className="text-caption-2-medium font-semibold text-text-primary">
            {t("pages.workspaces.createProject.newHost")}
          </span>
          <SshHostFields value={remote.draft} onChange={remote.setDraft} />
        </div>
      ) : remote.selected ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium font-medium text-text-secondary">
            {t("settings.workspace.sshPassword")}
          </Label>
          <InputGroup className="h-9 rounded-xl border-border-button-default bg-background-primary-default shadow-xs dark:bg-transparent">
            <InputGroupInput
              type={showSelectedPassword ? "text" : "password"}
              autoComplete="new-password"
              spellCheck={false}
              value={remote.draft.password}
              onChange={(event) => remote.setDraft({ ...remote.draft, password: event.target.value })}
              placeholder={
                remote.selected.auth === "password"
                  ? t("settings.workspace.sshPasswordSaved")
                  : t("settings.workspace.sshPasswordPlaceholder")
              }
              className="font-mono text-caption-1-regular text-text-primary"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                type="button"
                aria-label={showSelectedPassword ? t("settings.workspace.sshPasswordHide") : t("settings.workspace.sshPasswordShow")}
                onClick={() => setShowSelectedPassword((current) => !current)}
              >
                {showSelectedPassword ? <RiEyeOffLine className="size-3.5" /> : <RiEyeLine className="size-3.5" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      ) : null}

      {/* 远端已有路径 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium font-medium text-text-secondary">
          {t("settings.workspace.sshRemotePath")}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            value={remote.remotePath}
            onChange={(event) => remote.setRemotePath(event.target.value)}
            placeholder="/home/username/work/project"
            className="h-9 min-w-0 flex-1 rounded-xl font-mono text-caption-2-regular"
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={remote.busy || !remote.hostReady}
            onClick={() => void remote.browse(remote.remotePath.trim() || undefined)}
            className="h-9 gap-1.5 shrink-0 px-3 cursor-pointer text-caption-2-medium"
          >
            <RiFolder6Line className="size-3.5 text-text-secondary" />
            <span>{t("pages.workspaces.createProject.browseRemote")}</span>
          </Button>
        </div>
        <p className="text-[11px] text-text-tertiary">
          {t("pages.workspaces.createProject.remotePathHint")}
        </p>
      </div>

      {/* 远端目录浏览器 */}
      {remote.listing ? (
        <RemoteFolderPicker
          listing={remote.listing}
          busy={remote.busy}
          onOpen={(path) => void remote.browse(path)}
          onUse={(path) => {
            remote.setRemotePath(path)
            remote.setListing(null)
          }}
        />
      ) : null}

      {/* 连通性测试与状态反馈 */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border-button-default bg-background-secondary-default/30">
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={remote.busy || !remote.hostReady}
          onClick={() => void remote.testConnection()}
          className="h-8 gap-1.5 text-caption-2-medium cursor-pointer"
        >
          {remote.busy ? (
            <RiLoader4Line className="size-3.5 animate-spin text-accent-500" />
          ) : (
            <RiRadarLine className="size-3.5 text-text-secondary" />
          )}
          <span>{remote.busy ? "正在测试…" : t("pages.workspaces.createProject.testHost")}</span>
        </Button>

        {remote.probeNote ? (
          <div className="flex items-center gap-1.5 text-caption-2-medium truncate">
            {isProbeSuccess ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <RiCheckLine className="size-3.5" />
                <span>{remote.probeNote}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium truncate">
                <RiAlertLine className="size-3.5 shrink-0" />
                <span className="truncate">{remote.probeNote}</span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-text-tertiary">
            {remote.hostReady ? "主机已就绪，可测通连通性" : "请先选择或配置主机"}
          </span>
        )}
      </div>

      {/* 全局错误提示 */}
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-caption-1-regular text-rose-600 dark:text-rose-400">
          <RiAlertLine className="size-4 shrink-0 mt-0.5" />
          <span className="font-mono text-caption-2-regular break-all leading-relaxed">
            {error}
          </span>
        </div>
      ) : null}

      {/* 底部操作导航 */}
      <div className="mt-1 flex items-center justify-between border-t border-separator-border/60 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-8 text-caption-2-medium cursor-pointer"
        >
          {t("pages.workspaces.createProject.back")}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 text-caption-2-medium cursor-pointer"
          >
            {t("pages.workspaces.createProject.cancel")}
          </Button>
          <Button
            size="sm"
            disabled={loading || !remote.remotePath.trim() || !remote.hostReady}
            onClick={remote.submit}
            className="h-8 gap-1.5 text-caption-2-medium font-medium shadow-xs cursor-pointer"
          >
            {loading ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
            <span>{t("pages.workspaces.createProject.connect")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

