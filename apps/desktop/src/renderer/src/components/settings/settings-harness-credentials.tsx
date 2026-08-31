/**
 * Harness 状态与可选沙箱凭证。模型 key 只来自 Providers，不再单独填 Anthropic。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { SettingsRow } from "./settings-row"

export function SettingsHarnessCredentials() {
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
      <SettingsRow title="Status" description={harness?.blockedReason ?? "Ready to run this adapter."}>
        <span className="text-caption-1-medium text-text-secondary">
          {harness?.adapterLabel ?? "None"}
          {" · "}
          {harness?.hasProviderKey ? "Providers key" : "no provider key"}
          {harness?.needsSandbox ? ` · ${harness.hasSandboxToken ? "sandbox saved" : "sandbox missing"}` : ""}
        </span>
      </SettingsRow>
      {showSandbox ? (
        <>
          <SecretField
            title="Vercel Sandbox token"
            description="Jail for Claude Code only. The model key comes from your Anthropic provider."
            placeholder={harness?.hasSandboxToken ? "•••• saved" : "vercel token"}
            value={vercelToken}
            onChange={setVercelToken}
          />
          <SettingsRow title="Vercel team / project" description="Optional if the token already scopes a project.">
            <div className="flex flex-col gap-2 min-w-[16rem]">
              <Input className="rounded-2lg" placeholder="team id" value={vercelTeamId} onChange={(e) => setVercelTeamId(e.target.value)} />
              <Input className="rounded-2lg" placeholder="project id" value={vercelProjectId} onChange={(e) => setVercelProjectId(e.target.value)} />
            </div>
          </SettingsRow>
          <div className="flex justify-end px-1">
            <Button size="sm" disabled={saving} onClick={() => void onSave()}>
              Save sandbox token
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
