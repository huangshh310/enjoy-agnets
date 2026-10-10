/**
 * 进阶沙箱凭证表单。字段标题用隔离令牌 / 团队 ID / 项目 ID，禁止品牌名。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { SettingsRow } from "./settings-row"
import { SecretStorageWarning } from "./secret-storage-warning"
import { harnessStatusCopy } from "./harness-status-copy"
import { secretWriteErrorMessage, unwrapSecretWrite } from "@renderer/lib/secret-write"
import { showAppToast } from "@renderer/lib/app-toast"

export function SettingsHarnessCredentials() {
  const t = useT()
  const queryClient = useQueryClient()
  const harness = useSettingsSnapshot().data?.harness
  const [sandboxToken, setSandboxToken] = useState("")
  const [teamId, setTeamId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [saving, setSaving] = useState(false)
  const showSandbox = Boolean(harness?.available && harness.needsSandbox)
  const status = harnessStatusCopy(harness, t)

  async function onSave() {
    if (!hasIde()) return
    setSaving(true)
    try {
      unwrapSecretWrite(
        await getIde().settings.setHarness({
          vercelToken: sandboxToken,
          vercelTeamId: teamId,
          vercelProjectId: projectId
        })
      )
      setSandboxToken("")
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } catch (error) {
      showAppToast(secretWriteErrorMessage(error, t), { tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="px-5">
        <SecretStorageWarning />
      </div>
      <SettingsRow title={t("settings.harness.status")} description={status.description}>
        <span className="text-caption-1-medium text-text-secondary">{status.summary}</span>
      </SettingsRow>
      {showSandbox ? (
        <div className="flex flex-col gap-2.5 px-5 py-4">
          <label className="block text-caption-1-medium text-text-primary">
            <span className="font-medium">{t("settings.harness.isolationToken")}</span>
            <span className="ml-1 text-text-tertiary">{t("settings.harness.isolationTokenDesc")}</span>
            <Input
              type="password"
              className="mt-1 h-9 w-full rounded-xl"
              placeholder={
                harness?.hasSandboxToken ? t("settings.harness.tokenSaved") : t("settings.harness.tokenPlaceholder")
              }
              value={sandboxToken}
              onChange={(event) => setSandboxToken(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <IdField
              label={t("settings.harness.teamId")}
              hint={t("settings.harness.teamIdHint")}
              placeholder={t("settings.harness.teamId")}
              value={teamId}
              onChange={setTeamId}
            />
            <IdField
              label={t("settings.harness.projectId")}
              hint={t("settings.harness.projectIdHint")}
              placeholder={t("settings.harness.projectId")}
              value={projectId}
              onChange={setProjectId}
            />
          </div>
          <div>
            <Button size="sm" disabled={saving} onClick={() => void onSave()}>
              {t("settings.harness.saveToken")}
            </Button>
          </div>
          <p className="text-caption-1-medium text-text-secondary">{t("settings.harness.needBoth")}</p>
        </div>
      ) : null}
    </>
  )
}

function IdField({
  label,
  hint,
  placeholder,
  value,
  onChange
}: {
  label: string
  hint: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-caption-1-medium text-text-primary">
      <span className="font-medium">{label}</span>
      <span className="ml-1 text-text-tertiary">{hint}</span>
      <Input
        className="mt-1 h-9 w-full rounded-xl"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
