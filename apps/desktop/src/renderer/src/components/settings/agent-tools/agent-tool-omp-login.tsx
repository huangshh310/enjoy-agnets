/**
 * 设置里 Oh My Pi 必须按供应商登录，禁止无参 login。
 */
import { useMemo, useState } from "react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolOmpLogin({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const inspecting = useSettingsSnapshot().isInspectingAccounts
  const [query, setQuery] = useState("")
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (tool.providers ?? []).filter((item) => {
      if (item.origin === "custom") return false
      if (!q) return true
      return item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    })
  }, [query, tool.providers])
  const pending = rows.filter((item) => !item.loggedIn)
  const signed = rows.filter((item) => item.loggedIn)
  const busy = actions.busyAction === "login"
  return (
    <div className="space-y-2 rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3">
      <p className="text-caption-1-medium text-text-secondary">{t("settings.agentTools.ompLoginHint")}</p>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("settings.agentTools.ompLoginSearch")}
        className="h-8 w-full rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-caption-1-regular text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-500"
      />
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {pending.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 py-0.5">
            <span className="min-w-0 truncate text-caption-1-medium text-text-primary">{item.label}</span>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void actions.runLogin(item.id)}
              className="h-7 shrink-0 px-2 text-caption-2-medium"
            >
              {busy && actions.loginProvider === item.id
                ? t("settings.agentTools.loggingIn")
                : t("settings.agentTools.login")}
            </Button>
          </div>
        ))}
        {signed.length > 0 ? (
          <p className="pt-1 text-caption-2-medium text-text-tertiary">
            {t("settings.agentTools.ompSignedCount", { n: signed.length })}
          </p>
        ) : null}
        {pending.length === 0 && signed.length === 0 ? (
          <p className="text-caption-2-medium text-text-tertiary">
            {inspecting || tool.providers === undefined
              ? t("settings.agentTools.ompLoginLoading")
              : t("settings.agentTools.ompLoginEmpty")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
