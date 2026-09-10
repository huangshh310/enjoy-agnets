/**
 * 「这个助手用」下拉：官方登录 + 可筛选档案 + 底部添加。
 */
import { useMemo, useState } from "react"
import { RiAddLine, RiArrowDownSLine, RiCheckLine, RiSearchLine } from "@remixicon/react"
import {
  groupProvidersForBind,
  type AgentToolPublic,
  type ProviderPublic
} from "@enjoy-agents/ipc-contract"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { ProviderIcon } from "../providers/provider-icons"
import { BIND_SEARCH_AFTER } from "./agent-tool-constants"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolSourceMenu({
  tool,
  profiles,
  bound,
  usingProvider,
  persist,
  protocol,
  canAdd,
  onAdd
}: {
  tool: AgentToolPublic
  profiles: ProviderPublic[]
  bound?: ProviderPublic
  usingProvider: boolean
  persist: AgentToolActions["persist"]
  protocol: string
  canAdd: boolean
  onAdd: () => void
}) {
  const t = useT()
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.modelId.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
    )
  }, [profiles, query])
  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setQuery("") }}>
      <SourceTrigger tool={tool} bound={bound} usingProvider={usingProvider} />
      <DropdownMenuContent
        align="start"
        className={`${SETTINGS_DRAWER_Z_CLASS.float} w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {profiles.length >= BIND_SEARCH_AFTER ? (
          <SourceSearch query={query} onChange={setQuery} />
        ) : null}
        <div className="max-h-72 overflow-y-auto">
          <DropdownMenuItem
            onClick={() => {
              if (usingProvider) void persist({ useCustomProvider: false })
            }}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
          >
            <span className="text-caption-1-medium text-text-primary">{t("settings.agentTools.officialLogin")}</span>
            {!usingProvider ? <RiCheckLine className="size-3.5 text-accent-500" /> : null}
          </DropdownMenuItem>
          {filtered.length > 0 ? <DropdownMenuSeparator /> : null}
          <ProfileMenuRows
            profiles={filtered}
            boundId={usingProvider ? bound?.id : undefined}
            persist={persist}
          />
        </div>
        {canAdd ? <AddProviderRow protocol={protocol} onAdd={onAdd} /> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SourceTrigger({
  tool,
  bound,
  usingProvider
}: {
  tool: AgentToolPublic
  bound?: ProviderPublic
  usingProvider: boolean
}) {
  const t = useT()
  const officialLabel = tool.authAccount?.loggedIn
    ? t("settings.agentTools.accountSignedIn")
    : t("settings.agentTools.officialModeHint")
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 text-left shadow-2xs outline-none hover:border-border-button-hover focus:ring-1 focus:ring-accent-500"
      >
        {usingProvider && bound ? (
          <>
            <ProviderIcon kind={bound.kind} name={bound.name} apiStyle={bound.apiStyle} size={18} />
            <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
              {bound.name}
              <span className="text-text-tertiary"> · {tool.selectedModel || bound.modelId}</span>
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
            {t("settings.agentTools.officialLogin")}
            <span className="text-text-tertiary"> · {officialLabel}</span>
          </span>
        )}
        <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary" />
      </button>
    </DropdownMenuTrigger>
  )
}

function SourceSearch({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  const t = useT()
  return (
    <div className="relative px-1 py-1">
      <RiSearchLine className="absolute top-2.5 left-3 size-3.5 text-text-tertiary" />
      <input
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
        placeholder={t("settings.agentTools.searchProviders")}
        className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default/50 pr-2 pl-8 text-caption-2-medium outline-none focus:border-accent-500"
      />
    </div>
  )
}

function AddProviderRow({ protocol, onAdd }: { protocol: string; onAdd: () => void }) {
  const t = useT()
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onAdd}
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5"
      >
        <RiAddLine className="size-3.5 text-accent-500" />
        <span className="text-caption-1-medium text-text-primary">
          {t("settings.agentTools.goProviders", { protocol })}
        </span>
      </DropdownMenuItem>
    </>
  )
}

function ProfileMenuRows({
  profiles,
  boundId,
  persist
}: {
  profiles: ProviderPublic[]
  boundId?: string
  persist: AgentToolActions["persist"]
}) {
  const t = useT()
  const groups = groupProvidersForBind(profiles)
  const showHeads = groups.length > 1
  const groupHeads = {
    anthropic: t("settings.agentTools.bindGroupAnthropic"),
    openai: t("settings.agentTools.bindGroupOpenai"),
    google: t("settings.agentTools.bindGroupGoogle"),
    deepseek: t("settings.agentTools.bindGroupDeepseek"),
    other: t("settings.agentTools.bindGroupOther")
  }
  return (
    <>
      {groups.map((group) => (
        <div key={group.group}>
          {showHeads ? (
            <DropdownMenuLabel className="px-2.5 py-1 text-caption-2-medium text-text-tertiary">
              {groupHeads[group.group]}
            </DropdownMenuLabel>
          ) : null}
          {group.items.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              selected={boundId === profile.id}
              persist={persist}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function ProfileRow({
  profile,
  selected,
  persist
}: {
  profile: ProviderPublic
  selected: boolean
  persist: AgentToolActions["persist"]
}) {
  return (
    <DropdownMenuItem
      onClick={() => {
        if (selected) return
        void persist({
          useCustomProvider: true,
          providerId: profile.id,
          modelId: profile.modelId
        })
      }}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5"
    >
      <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={16} />
      <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">
        {profile.name}
        <span className="text-text-tertiary"> · {profile.modelId}</span>
      </span>
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
    </DropdownMenuItem>
  )
}
