/**
 * 已配置的 Provider 列表条目：清晰展示激活状态、协议类型、主模型、模型总数、端点与 Key 提示，
 * 提供一键切换激活、网络测速、编辑与删除操作。
 */
import {
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
  RiPulseLine,
  RiStackLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { ProviderPublic } from "@enjoy-agents/ipc-contract"
import { apiStyleLabel, isApiStyle } from "@enjoy-agents/providers/presets"
import { ProviderIcon } from "./provider-icons"
import type { PingStateMap } from "./use-provider-settings"

export function ProviderList({
  providers,
  pingStates,
  onPing,
  onEdit,
  onActivate,
  onRemove
}: {
  providers: ProviderPublic[]
  pingStates?: PingStateMap
  onPing?: (profile: ProviderPublic) => void
  onEdit: (profile: ProviderPublic) => void
  onActivate: (id: string) => void
  onRemove: (id: string) => void
}) {
  if (providers.length === 0) return null

  return (
    <div className="divide-y divide-separator-border/60">
      {providers.map((profile) => (
        <ProviderItemRow
          key={profile.id}
          profile={profile}
          pingState={pingStates?.[profile.id]}
          onPing={onPing ? () => onPing(profile) : undefined}
          onEdit={() => onEdit(profile)}
          onActivate={() => onActivate(profile.id)}
          onRemove={() => onRemove(profile.id)}
        />
      ))}
    </div>
  )
}

function ProviderItemRow({
  profile,
  pingState,
  onPing,
  onEdit,
  onActivate,
  onRemove
}: {
  profile: ProviderPublic
  pingState?: PingStateMap[string]
  onPing?: () => void
  onEdit: () => void
  onActivate: () => void
  onRemove: () => void
}) {
  const protocolName = isApiStyle(profile.apiStyle)
    ? apiStyleLabel(profile.apiStyle)
    : profile.apiStyle || "OpenAI Compatible"

  const hasKeyIssue = profile.requiresKey && !profile.hasKey
  const modelCount = profile.models?.length || 1

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

          {modelCount > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
              <RiStackLine className="size-3" />
              {modelCount} models
            </span>
          ) : null}

          {/* 测速延迟 Badge */}
          {pingState?.status === "ok" && typeof pingState.latencyMs === "number" ? (
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium",
                pingState.latencyMs < 500
                  ? "bg-state-success-text/10 text-state-success-text"
                  : pingState.latencyMs < 1500
                    ? "bg-state-warning-text/10 text-state-warning-text"
                    : "bg-state-error-text/10 text-state-error-text"
              )}
            >
              <span
                className={cx(
                  "size-1.5 rounded-full",
                  pingState.latencyMs < 500
                    ? "bg-state-success-text"
                    : pingState.latencyMs < 1500
                      ? "bg-state-warning-text"
                      : "bg-state-error-text"
                )}
              />
              {pingState.latencyMs}ms
            </span>
          ) : pingState?.status === "error" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-state-error-text/10 px-2 py-0.5 text-[11px] font-medium text-state-error-text">
              <span className="size-1.5 rounded-full bg-state-error-text" />
              {pingState.message || "Failed"}
            </span>
          ) : null}
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
                ? "Missing API Key"
                : "No Key Required"}
          </span>
        </div>
      </div>

      {/* 右侧操作按钮组 */}
      <div className="flex shrink-0 items-center gap-2">
        {/* 测速按钮 */}
        {onPing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPing}
            disabled={pingState?.status === "pending"}
            className="h-8 rounded-xl px-2.5 text-caption-1-medium text-text-secondary hover:text-text-primary"
            title="Test network latency to this endpoint"
          >
            {pingState?.status === "pending" ? (
              <RiLoader4Line className="size-3.5 animate-spin mr-1 text-accent-500" />
            ) : (
              <RiPulseLine className="size-3.5 mr-1 text-accent-500" />
            )}
            <span>Speed test</span>
          </Button>
        ) : null}

        {profile.active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            className="h-8 rounded-xl px-3 text-caption-1-medium text-text-tertiary cursor-default"
          >
            In use
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onActivate}
            className="h-8 rounded-xl px-3 text-caption-1-medium hover:border-accent-500 hover:text-accent-600"
          >
            Use
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 rounded-xl px-2.5 text-caption-1-medium"
        >
          <RiEditLine className="size-3.5 mr-1" />
          Edit
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 rounded-xl p-0 text-text-tertiary hover:bg-background-negative-hover/20 hover:text-state-error-text"
          aria-label={`Delete ${profile.name}`}
        >
          <RiDeleteBinLine className="size-4" />
        </Button>
      </div>
    </article>
  )
}
