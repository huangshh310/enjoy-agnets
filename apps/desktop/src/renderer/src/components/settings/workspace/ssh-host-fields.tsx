/**
 * SSH 主机字段：设置名册与创建弹窗共用。不收集私钥内容。
 */
import { useState } from "react"
import {
  RiEyeLine,
  RiEyeOffLine,
  RiFolderOpenLine,
  RiKey2Line,
  RiLockPasswordLine
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
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { SshHostDraft } from "./ssh-host-fields.types"

export type { SshHostDraft } from "./ssh-host-fields.types"
export { draftToUpsert, emptyHostDraft } from "./ssh-host-fields.types"

export function SshHostFields({
  value,
  onChange,
  showAlias = true
}: {
  value: SshHostDraft
  onChange: (next: SshHostDraft) => void
  showAlias?: boolean
}) {
  const t = useT()
  const [showPassword, setShowPassword] = useState(false)

  function patch(partial: Partial<SshHostDraft>) {
    onChange({ ...value, ...partial })
  }

  async function pickKey() {
    if (!hasIde()) return
    const picked = (await getIde().workspace.pickSshKey()) as { path: string } | undefined
    if (picked?.path) patch({ keyPath: picked.path })
  }

  return (
    <div className="flex flex-col gap-3.5">
      {showAlias ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-caption-1-medium font-medium text-text-secondary">
            {t("settings.workspace.sshAlias")}
          </Label>
          <Input
            value={value.alias}
            onChange={(event) => patch({ alias: event.target.value })}
            placeholder="例如: 香港开发机 / devbox"
            className="h-9 rounded-xl font-sans text-caption-1-regular"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-caption-1-medium font-medium text-text-secondary">
            {t("settings.workspace.sshHost")}
          </Label>
          <Input
            value={value.host}
            onChange={(event) => patch({ host: event.target.value })}
            placeholder="152.32.225.119 或 host.internal"
            className="h-9 rounded-xl font-mono text-caption-1-regular"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <Label className="text-caption-1-medium font-medium text-text-secondary">
            {t("settings.workspace.sshPort")}
          </Label>
          <Input
            value={value.port}
            onChange={(event) => patch({ port: event.target.value })}
            placeholder="22"
            className="h-9 rounded-xl font-mono text-caption-1-regular"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium font-medium text-text-secondary">
          {t("settings.workspace.sshUser")}
        </Label>
        <Input
          value={value.user}
          onChange={(event) => patch({ user: event.target.value })}
          placeholder="例如: ubuntu / root / alice"
          className="h-9 rounded-xl font-mono text-caption-1-regular"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-caption-1-medium font-medium text-text-secondary inline-flex items-center gap-1">
          <RiLockPasswordLine className="size-3.5 text-text-tertiary" />
          <span>{t("settings.workspace.sshPassword")}</span>
        </Label>
        <InputGroup className="h-9 rounded-xl border-border-button-default bg-background-primary-default shadow-xs dark:bg-transparent">
          <InputGroupInput
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            spellCheck={false}
            value={value.password}
            onChange={(event) => patch({ password: event.target.value })}
            placeholder={
              value.passwordSaved
                ? t("settings.workspace.sshPasswordSaved")
                : t("settings.workspace.sshPasswordPlaceholder")
            }
            className="font-mono text-caption-1-regular text-text-primary"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              type="button"
              aria-label={showPassword ? t("settings.workspace.sshPasswordHide") : t("settings.workspace.sshPasswordShow")}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <RiEyeOffLine className="size-3.5" /> : <RiEyeLine className="size-3.5" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p className="text-[11px] text-text-tertiary leading-normal">{t("settings.workspace.sshPasswordHint")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-caption-1-medium font-medium text-text-secondary inline-flex items-center gap-1">
            <RiKey2Line className="size-3.5 text-text-tertiary" />
            <span>{t("settings.workspace.sshKeyPath")}</span>
          </Label>
          <span className="text-[11px] text-text-tertiary">{t("settings.workspace.sshAgentDefault")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 min-w-0 flex-1 rounded-xl font-mono text-caption-2-regular"
            value={value.keyPath}
            onChange={(event) => patch({ keyPath: event.target.value })}
            placeholder={t("settings.workspace.sshKeyPathPlaceholder")}
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => void pickKey()}
            className="h-9 gap-1.5 shrink-0 px-3 cursor-pointer text-caption-2-medium"
          >
            <RiFolderOpenLine className="size-3.5 text-text-secondary" />
            <span>{t("settings.workspace.sshPickKey")}</span>
          </Button>
        </div>
        <p className="text-[11px] text-text-tertiary leading-normal">
          {t("settings.workspace.sshKeyPathHint")}
        </p>
      </div>
    </div>
  )
}


