/**
 * CLI 模型浏览：左栏供应商 + 右栏模型 / 登录空态。
 */
import { useMemo, useState } from "react"
import { capabilitiesFor, type AgentCliModel, type AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiSearchLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { CliModelRow } from "./cli-model-row"
import { CliCustomNeedConfig, CliNeedLogin } from "./cli-need-login"
import { CliProviderNav } from "./cli-provider-nav"
import {
  buildCliProviderRows,
  cliCatalogPending,
  initialCliNavKey,
  modelsForCliProvider,
  providerOf,
  shouldShowCliProviderNav
} from "./cli-provider-rows"

export function CliModelsBrowser({
  agent,
  onPick,
  onLoginProvider,
  loginBusy,
  loginHint,
  inspecting
}: {
  agent: AgentToolPublic
  onPick: (model: AgentCliModel) => void
  onLoginProvider?: (providerId: string) => void
  loginBusy?: string | null
  loginHint?: string
  inspecting?: boolean
}) {
  const t = useT()
  const [query, setQuery] = useState("")
  const rows = useMemo(() => buildCliProviderRows(agent), [agent])
  const split = shouldShowCliProviderNav(agent)
  const catalogPending = cliCatalogPending(agent, inspecting === true)
  const [providerKey, setProviderKey] = useState(() =>
    initialCliNavKey(rows, agent.selectedModel)
  )
  const current = providerOf(rows, providerKey)
  const visible = useMemo(() => {
    const source = split ? modelsForCliProvider(agent.models, providerKey) : agent.models
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    )
  }, [agent.models, providerKey, query, split])

  return (
    <div className="flex min-h-0 flex-1">
      {split ? (
        <CliProviderNav
          rows={rows}
          total={agent.models.length}
          selectedKey={providerKey}
          loginBusy={loginBusy}
          catalogPending={catalogPending}
          onSelect={setProviderKey}
          onLogin={onLoginProvider}
        />
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-separator-border bg-background-secondary-default/20 px-3.5 py-2 text-text-tertiary">
          <RiSearchLine className="size-3.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("chat.searchInProvider", { name: current?.label ?? agent.label })}
            className="min-w-0 flex-1 bg-transparent text-caption-1-regular text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
        <CliModelsPane
          catalogPending={catalogPending}
          current={current}
          visible={visible}
          agentId={agent.id}
          selectedModel={agent.selectedModel}
          loginBusy={loginBusy}
          loginHint={loginHint}
          onPick={onPick}
          onLoginProvider={onLoginProvider}
        />
      </div>
    </div>
  )
}

function CliModelsPane({
  catalogPending,
  current,
  visible,
  agentId,
  selectedModel,
  loginBusy,
  loginHint,
  onPick,
  onLoginProvider
}: {
  catalogPending: boolean
  current: ReturnType<typeof providerOf>
  visible: AgentCliModel[]
  agentId: string
  selectedModel?: string
  loginBusy?: string | null
  loginHint?: string
  onPick: (model: AgentCliModel) => void
  onLoginProvider?: (providerId: string) => void
}) {
  const t = useT()
  if (catalogPending) {
    return (
      <p className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-caption-1-medium text-text-tertiary">
        {t("chat.cliProvidersLoading")}
      </p>
    )
  }
  if (current && !current.loggedIn && current.origin === "custom") return <CliCustomNeedConfig />
  if (current && !current.loggedIn) {
    return (
      <CliNeedLogin
        name={current.label}
        kind={current.loginKind}
        busy={loginBusy === current.key}
        hint={loginHint}
        onLogin={() => onLoginProvider?.(current.key)}
      />
    )
  }
  return (
    <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-1.5">
      {visible.map((model) => (
        <li key={model.id} className="min-w-0">
          <CliModelRow
            agentId={agentId}
            model={model}
            selected={model.id === selectedModel}
            onPick={onPick}
          />
        </li>
      ))}
      {visible.length === 0 ? (
        <li className="px-6 py-6 text-center text-caption-2-medium text-text-tertiary">
          {capabilitiesFor(agentId).models === "none"
            ? t("chat.cliDefaultModelHint")
            : t("chat.noModelsFound")}
        </li>
      ) : null}
    </ul>
  )
}
