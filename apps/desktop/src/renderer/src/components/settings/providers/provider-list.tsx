/**
 * 已配置档案列表。单行在 provider-configured-row。
 */
import type { AgentBindRef, ProviderPublic } from "@enjoy-agents/ipc-contract"
import { ProviderConfiguredRow } from "./provider-configured-row"
import type { PingStateMap } from "./use-provider-settings"

export function ProviderList({
  providers,
  pingStates,
  refsByProvider,
  onPing,
  onEdit,
  onActivate,
  onRemove,
  onDuplicate,
  onSetEnabled,
  onOpenAgent
}: {
  providers: ProviderPublic[]
  pingStates?: PingStateMap
  refsByProvider?: Record<string, AgentBindRef[]>
  onPing?: (profile: ProviderPublic) => void
  onEdit: (profile: ProviderPublic) => void
  onActivate: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (profile: ProviderPublic) => void
  onSetEnabled: (id: string, enabled: boolean) => void
  onOpenAgent?: (runtimeId: string) => void
}) {
  if (providers.length === 0) return null

  return (
    <div data-testid="providers-configured-list" className="divide-y divide-separator-border/60">
      {providers.map((profile) => (
        <ProviderConfiguredRow
          key={profile.id}
          profile={profile}
          pingState={pingStates?.[profile.id]}
          refs={refsByProvider?.[profile.id] ?? []}
          onPing={onPing ? () => onPing(profile) : undefined}
          onEdit={() => onEdit(profile)}
          onActivate={() => onActivate(profile.id)}
          onRemove={() => onRemove(profile.id)}
          onDuplicate={() => onDuplicate(profile)}
          onSetEnabled={(enabled) => onSetEnabled(profile.id, enabled)}
          onOpenAgent={onOpenAgent}
        />
      ))}
    </div>
  )
}
