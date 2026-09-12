/**
 * 「这个助手用」账号下拉：只列官方登录 + 可筛选档案。
 * 添加档案在菜单外（见 AgentToolAddArchiveLink），禁止菜单内「+ 添加 {品牌}」。
 * 触发器只写档案名（或官方登录），不把模型 id 粘进同一行。
 */
import { useMemo, useState } from "react"
import { groupProvidersForBind, type AgentToolPublic, type ProviderPublic } from "@enjoy-agents/ipc-contract"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { SETTINGS_DRAWER_Z_CLASS } from "../settings-overlay"
import { ProviderIcon } from "../providers/provider-icons"
import { BIND_SEARCH_AFTER } from "./agent-tool-constants"
import { archiveSubtitle } from "./bind-source/archive-copy"
import { BIND_TRIGGER_CLASS, BindTriggerFace } from "./bind-source/bind-field"
import { OfficialMenuRow, ProfileMenuRows, SourceSearch } from "./bind-source/source-menu-rows"
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
        className={`${SETTINGS_DRAWER_Z_CLASS.float} min-w-72 w-(--radix-dropdown-menu-trigger-width) overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-1 shadow-dropdown`}
      >
        {profiles.length >= BIND_SEARCH_AFTER ? <SourceSearch query={query} onChange={setQuery} /> : null}
        <div className="max-h-72 overflow-y-auto">
          <OfficialMenuRow
            toolId={tool.id}
            selected={!usingProvider}
            persist={persist}
            usingProvider={usingProvider}
          />
          {filtered.length > 0 ? <DropdownMenuSeparator /> : null}
          <ProfileMenuRows
            profiles={filtered}
            boundId={usingProvider ? bound?.id : undefined}
            persist={persist}
            showArchiveHead={groupProvidersForBind(filtered).length <= 1}
          />
        </div>
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
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={t("settings.agentTools.bindAccountLabel")}
        className={BIND_TRIGGER_CLASS}
      >
        {usingProvider && bound ? (
          <BindTriggerFace
            leading={
              <ProviderIcon kind={bound.kind} name={bound.name} apiStyle={bound.apiStyle} size={22} />
            }
            title={bound.name}
            subtitle={archiveSubtitle(bound, t)}
          />
        ) : (
          <BindTriggerFace
            leading={<AgentBrandIcon id={tool.id} size={22} />}
            title={t("settings.agentTools.officialLogin")}
            subtitle={
              tool.authAccount?.loggedIn
                ? t("settings.agentTools.accountSignedIn")
                : t("settings.agentTools.officialModeHint")
            }
          />
        )}
      </button>
    </DropdownMenuTrigger>
  )
}
