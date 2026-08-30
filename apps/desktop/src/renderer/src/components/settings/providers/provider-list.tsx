/**
 * 已配置的 Provider 列表：清晰展示激活状态、协议类型、模型、端点与 Key 提示，
 * 提供一键切换激活、编辑与删除操作。
 */
import { RiDeleteBinLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import { apiStyleLabel, isApiStyle } from "@enjoy-agents/providers/presets"
import { SettingsCard } from "../settings-row"
import { ProviderIcon } from "./provider-icons"

export function ProviderList({
  providers,
  onEdit,
  onActivate,
  onRemove
}: {
  providers: ProviderPublic[]
  onEdit: (profile: ProviderPublic) => void
  onActivate: (id: string) => void
  onRemove: (id: string) => void
}) {
  if (providers.length === 0) return null

  return (
    <SettingsCard
      title={`Configured Providers (${providers.length})`}
    >
      {providers.map((profile) => (
        <ProviderItemRow
          key={profile.id}
          profile={profile}
          onEdit={() => onEdit(profile)}
          onActivate={() => onActivate(profile.id)}
          onRemove={() => onRemove(profile.id)}
        />
      ))}
    </SettingsCard>
  )
}

function ProviderItemRow({
  profile,
  onEdit,
  onActivate,
  onRemove
}: {
  profile: ProviderPublic
  onEdit: () => void
  onActivate: () => void
  onRemove: () => void
}) {
  const protocolName = isApiStyle(profile.apiStyle)
    ? apiStyleLabel(profile.apiStyle)
    : profile.apiStyle || "OpenAI Compatible"

  const hasKeyIssue = profile.requiresKey && !profile.hasKey

  return (
    <article
      className={cx(
        "flex items-center gap-4 px-5 py-4 transition-colors",
        profile.active
          ? "bg-background-secondary-default/40"
          : "hover:bg-background-secondary-hover/30"
      )}
    >
      {/* 供应商品牌图标（带激活微边框） */}
      <div
        className={cx(
          "relative flex size-10 shrink-0 items-center justify-center rounded-xl border p-1.5 shadow-xs transition-all",
          profile.active
            ? "border-accent-500/40 bg-background-primary-default ring-2 ring-accent-500/10"
            : "border-border-button-default bg-background-primary-default"
        )}
      >
        <ProviderIcon kind={profile.kind} name={profile.name} apiStyle={profile.apiStyle} size={24} />
      </div>

      {/* 核心信息区 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-body-medium font-semibold text-text-primary">
            {profile.name}
          </span>

          {profile.active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-text/10 px-2.5 py-0.5 text-caption-1-semibold text-state-success-text">
              <span className="size-1.5 rounded-full bg-state-success-text" />
              Active
            </span>
          ) : null}

          <span className="rounded-md border border-border-button-default/80 bg-background-tertiary-default/80 px-2 py-0.5 text-caption-1-medium text-text-secondary">
            {protocolName}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption-1-medium text-text-tertiary">
          <span className="font-mono text-text-secondary font-medium">
            {profile.modelId || "No model configured"}
          </span>
          <span>·</span>
          <span
            className="truncate max-w-[320px] font-mono text-text-tertiary"
            title={profile.baseURL || "Default endpoint"}
          >
            {profile.baseURL || "Default endpoint"}
          </span>
          <span>·</span>
          <span
            className={cx(
              hasKeyIssue
                ? "text-text-error-primary font-medium"
                : "text-text-tertiary"
            )}
          >
            {profile.hasKey
              ? `Key ${profile.keyHint}`
              : profile.requiresKey
                ? "Key missing"
                : "No key required"}
          </span>
        </div>
      </div>

      {/* 右侧动作操作栏 */}
      <div className="flex shrink-0 items-center gap-2">
        {profile.active ? (
          <span className="rounded-lg bg-background-tertiary-default px-3 py-1.5 text-caption-1-medium text-text-tertiary">
            In use
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={onActivate}>
            Use
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="text-text-secondary hover:text-text-primary"
        >
          <RiEditLine className="size-4 mr-1" />
          Edit
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Delete provider"
          onClick={onRemove}
          className="text-text-tertiary hover:text-text-error-primary"
        >
          <RiDeleteBinLine className="size-4" />
        </Button>
      </div>
    </article>
  )
}
