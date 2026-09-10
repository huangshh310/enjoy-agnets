/**
 * 账号下拉里的行：官方登录、已保存档案、底部添加。
 */
import { RiAddLine, RiCheckLine, RiSearchLine } from "@remixicon/react"
import { groupProvidersForBind, type ProviderPublic } from "@enjoy-agents/ipc-contract"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { ProviderIcon } from "../../providers/provider-icons"
import { archiveSubtitle } from "./archive-copy"
import { BindMenuFace } from "./bind-field"
import type { AgentToolActions } from "../use-agent-tool-actions"

export function OfficialMenuRow({
  toolId,
  selected,
  persist,
  usingProvider
}: {
  toolId: string
  selected: boolean
  persist: AgentToolActions["persist"]
  usingProvider: boolean
}) {
  const t = useT()
  return (
    <DropdownMenuItem
      onClick={() => {
        if (usingProvider) void persist({ useCustomProvider: false })
      }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2"
    >
      <BindMenuFace
        leading={<AgentBrandIcon id={toolId} size={18} />}
        title={t("settings.agentTools.officialLogin")}
        subtitle={t("settings.agentTools.bindOfficialMenuHint")}
      />
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
    </DropdownMenuItem>
  )
}

export function SourceSearch({ query, onChange }: { query: string; onChange: (value: string) => void }) {
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

export function AddProviderRow({ protocol, onAdd }: { protocol: string; onAdd: () => void }) {
  const t = useT()
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onAdd}
        className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2"
      >
        <RiAddLine className="size-3.5 text-accent-500" />
        <span className="text-caption-1-medium text-text-primary">
          {t("settings.agentTools.goProviders", { protocol })}
        </span>
      </DropdownMenuItem>
    </>
  )
}

export function ProfileMenuRows({
  profiles,
  boundId,
  persist,
  showArchiveHead
}: {
  profiles: ProviderPublic[]
  boundId?: string
  persist: AgentToolActions["persist"]
  showArchiveHead: boolean
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
      {showArchiveHead && !showHeads && profiles.length > 0 ? (
        <DropdownMenuLabel className="px-2.5 py-1 text-caption-2-medium text-text-tertiary">
          {t("settings.agentTools.bindMenuArchives")}
        </DropdownMenuLabel>
      ) : null}
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
  const t = useT()
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
      className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2"
    >
      <BindMenuFace
        leading={
          <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={18} />
        }
        title={profile.name}
        subtitle={archiveSubtitle(profile, t)}
      />
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
    </DropdownMenuItem>
  )
}
