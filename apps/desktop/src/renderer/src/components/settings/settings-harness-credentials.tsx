/**
 * Settings → Agent：Claude Code / Vercel 凭证表单。
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
  const [anthropicApiKey, setAnthropicApiKey] = useState("")
  const [vercelToken, setVercelToken] = useState("")
  const [vercelTeamId, setVercelTeamId] = useState("")
  const [vercelProjectId, setVercelProjectId] = useState("")
  const [saving, setSaving] = useState(false)

  async function onSave() {
    if (!hasIde()) return
    setSaving(true)
    try {
      await getIde().settings.setHarness({
        anthropicApiKey,
        vercelToken,
        vercelTeamId,
        vercelProjectId
      })
      setAnthropicApiKey("")
      setVercelToken("")
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <HarnessStatusRow
        ready={Boolean(harness?.ready)}
        hasAnthropicKey={Boolean(harness?.hasAnthropicKey)}
        hasVercelToken={Boolean(harness?.hasVercelToken)}
      />
      <SecretField
        title="Anthropic API key"
        description="Used by Claude Code inside the sandbox."
        placeholder={harness?.hasAnthropicKey ? "•••• saved" : "sk-ant-…"}
        value={anthropicApiKey}
        onChange={setAnthropicApiKey}
      />
      <SecretField
        title="Vercel token"
        description="token + team/project from vercel link / dashboard."
        placeholder={harness?.hasVercelToken ? "•••• saved" : "vercel token"}
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
          Save harness credentials
        </Button>
      </div>
    </>
  )
}

function HarnessStatusRow({
  ready,
  hasAnthropicKey,
  hasVercelToken
}: {
  ready: boolean
  hasAnthropicKey: boolean
  hasVercelToken: boolean
}) {
  return (
    <SettingsRow
      title="Status"
      description={
        ready
          ? "Anthropic and Vercel credentials are saved."
          : "Harness needs an Anthropic API key and a Vercel Sandbox token."
      }
    >
      <span className="text-caption-1-medium text-text-secondary">
        {hasAnthropicKey ? "Anthropic · saved" : "Anthropic · missing"}
        {" · "}
        {hasVercelToken ? "Vercel · saved" : "Vercel · missing"}
      </span>
    </SettingsRow>
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
