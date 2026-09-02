/**
 * Harness 状态与可选沙箱凭证。模型 key 只来自 Providers，不再单独填 Anthropic。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { SettingsRow } from "./settings-row"

export function SettingsHarnessCredentials() {
  const t = useT()
  const queryClient = useQueryClient()
  const harness = useSettingsSnapshot().data?.harness
  const [vercelToken, setVercelToken] = useState("")
  const [vercelTeamId, setVercelTeamId] = useState("")
  const [vercelProjectId, setVercelProjectId] = useState("")
  const [saving, setSaving] = useState(false)
  const showSandbox = Boolean(harness?.available && harness.needsSandbox)

  async function onSave() {
    if (!hasIde()) return
    setSaving(true)
    try {
      await getIde().settings.setHarness({ vercelToken, vercelTeamId, vercelProjectId })
      setVercelToken("")
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SettingsRow title={t("settings.harness.status")} description={harness?.blockedReason ?? t("settings.harness.ready")}>
        <span className="text-caption-1-medium text-text-secondary">
          {harness?.adapterLabel ?? t("settings.harness.none")}
          {" · "}
          {harness?.hasProviderKey ? t("common.providersKey") : t("common.noProviderKey")}
          {harness?.needsSandbox
            ? ` · ${harness.hasSandboxToken ? t("settings.harness.sandboxSaved") : t("settings.harness.sandboxMissing")}`
            : ""}
        </span>
      </SettingsRow>
      {showSandbox ? (
        <>
          <SecretField
            title={t("settings.harness.vercelToken")}
            description={t("settings.harness.vercelTokenDesc")}
            placeholder={harness?.hasSandboxToken ? t("settings.harness.tokenSaved") : t("settings.harness.tokenPlaceholder")}
            value={vercelToken}
            onChange={setVercelToken}
          />
          <SettingsRow title={t("settings.harness.teamProject")} description={t("settings.harness.teamProjectDesc")}>
            <div className="flex flex-col gap-2 min-w-[16rem]">
              <Input
                className="rounded-2lg"
                placeholder={t("settings.harness.teamId")}
                value={vercelTeamId}
                onChange={(e) => setVercelTeamId(e.target.value)}
              />
              <Input
                className="rounded-2lg"
                placeholder={t("settings.harness.projectId")}
                value={vercelProjectId}
                onChange={(e) => setVercelProjectId(e.target.value)}
              />
            </div>
          </SettingsRow>
          <div className="flex justify-end px-1">
            <Button size="sm" disabled={saving} onClick={() => void onSave()}>
              {t("settings.harness.saveToken")}
            </Button>
          </div>
        </>
      ) : null}
    </>
  )
}

function SecretField({
  title,
  description,
  placeholder,
  value,
  onChange
}: {
  title: string
  description: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SettingsRow title={title} description={description}>
      <Input
        type="password"
        className="min-w-[16rem] rounded-2lg"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </SettingsRow>
  )
}
