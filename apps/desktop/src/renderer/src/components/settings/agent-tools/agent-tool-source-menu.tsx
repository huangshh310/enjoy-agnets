/**
 * 「这个助手用」下拉：只列官方登录 + 已有 vault 档案。
 * 添加档案在菜单外（见 AgentToolAddArchiveLink），禁止菜单内「+ 添加 {品牌}」。
 */
import { useMemo, useState } from "react"
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from "@remixicon/react"
import {
  groupProvidersForBind,
  providerBindGroupOf,
  type AgentToolPublic,
  type ProviderBindGroupId,
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
  persist
}: {
  tool: AgentToolPublic
  profiles: ProviderPublic[]
  bound?: ProviderPublic
  usingProvider: boolean
  persist: AgentToolActions["persist"]
}) {
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
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery("")
      }}
    >
      <SourceTrigger tool={tool} bound={bound} usingProvider={usingProvider} />
      <DropdownMenuContent
        align="start"
        className={`${SETTINGS_DRAWER_Z_CLASS.float} w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {profiles.length >= BIND_SEARCH_AFTER ? (
          <SourceSearch query={query} onChange={setQuery} />
        ) : null}
        <div className="max-h-72 overflow-y-auto">
          <OfficialMenuItem usingProvider={usingProvider} persist={persist} />
          {filtered.length > 0 ? <DropdownMenuSeparator /> : null}
          <ProfileMenuRows
            profiles={filtered}
            boundId={usingProvider ? bound?.id : undefined}
            persist={persist}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OfficialMenuItem({
  usingProvider,
  persist
}: {
  usingProvider: boolean
  persist: AgentToolActions["persist"]
}) {
  const t = useT()
  return (
    <DropdownMenuItem
      onClick={() => {
        if (usingProvider) void persist({ useCustomProvider: false })
      }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
    >
      <span className="text-caption-1-medium text-text-primary">
        {t("settings.agentTools.officialLogin")}
        <span className="text-text-tertiary"> · {t("settings.agentTools.officialModeHint")}</span>
      </span>
      {!usingProvider ? <RiCheckLine className="size-3.5 text-accent-500" /> : null}
    </DropdownMenuItem>
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
  const groupHeads = bindGroupHeads(t)
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
              brand={groupHeads[providerBindGroupOf(profile)]}
              selected={boundId === profile.id}
              persist={persist}
            />
          ))}
        </div>
      ))}
    </>
  )
}

function bindGroupHeads(t: (key: string) => string): Record<ProviderBindGroupId, string> {
  return {
    anthropic: t("settings.agentTools.bindGroupAnthropic"),
    openai: t("settings.agentTools.bindGroupOpenai"),
    google: t("settings.agentTools.bindGroupGoogle"),
    deepseek: t("settings.agentTools.bindGroupDeepseek"),
    other: t("settings.agentTools.bindGroupOther")
  }
}

/** 预览锁：{供应商} · {档案名}；档案名已含品牌或 other 组则不重复。 */
function profileBrandName(profile: ProviderPublic, brand: string): string {
  if (providerBindGroupOf(profile) === "other") return profile.name
  if (!brand || brand.toLowerCase() === profile.name.toLowerCase()) return profile.name
  return `${brand} · ${profile.name}`
}

function ProfileRow({
  profile,
  brand,
  selected,
  persist
}: {
  profile: ProviderPublic
  brand: string
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
        {profileBrandName(profile, brand)}
        <span className="text-text-tertiary"> · {profile.modelId}</span>
      </span>
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
    </DropdownMenuItem>
  )
}
