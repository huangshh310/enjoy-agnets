/**
 * Settings → Model capabilities：全景模型能力矩阵与探测中心。
 * 提供当前主模型核心能力脉冲卡、全量已配置模型的多维能力矩阵、分类筛选与一键设为默认模型。
 */
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  RiEyeLine,
  RiGitBranchLine,
  RiImageLine,
  RiInformationLine,
  RiMentalHealthLine,
  RiSearchLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { applySettingsSnapshot } from "@renderer/hooks/use-agent-session"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { ModelBrandIcon } from "./providers/provider-icons"
import { useT } from "@renderer/i18n"
import { SettingsCard } from "./settings-row"
import { CapabilityBadge, CapabilityGuideItem } from "./capabilities/capability-badge"
import { ModelCapabilityRow } from "./capabilities/model-capability-row"

export type CapabilityFilter = "all" | "vision" | "tools" | "reasoning" | "media" | "embeddings"

export function CapabilitySettings() {
  const t = useT()
  const queryClient = useQueryClient()
  const settingsQuery = useSettingsSnapshot()
  const configuredModels = useChatStore((state) => state.models)
  const defaultModelId = settingsQuery.data?.defaultModelId ?? useChatStore.getState().modelId
  const setModel = useChatStore((state) => state.setModel)

  const [activeFilter, setActiveFilter] = useState<CapabilityFilter>("all")
  const [search, setSearch] = useState("")
  const [probing, setProbing] = useState(false)

  // 1. 获取当前默认激活的模型详情
  const activeModel = useMemo(() => {
    return (
      configuredModels.find((m) => m.id === defaultModelId) ??
      configuredModels[0] ?? {
        id: defaultModelId || "unknown",
        label: defaultModelId || t("settings.capabilities.defaultModelFallback"),
        provider: "custom",
        capabilities: ["text", "streaming", "tools", "structured"]
      }
    )
  }, [configuredModels, defaultModelId])

  // 2. 根据能力类型过滤模型列表
  const filteredModels = useMemo(() => {
    return configuredModels.filter((model) => {
      // 文本搜索匹配
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchId = model.id.toLowerCase().includes(q)
        const matchLabel = model.label.toLowerCase().includes(q)
        const matchProvider = (model.providerName || model.provider || "").toLowerCase().includes(q)
        if (!matchId && !matchLabel && !matchProvider) return false
      }

      const caps = model.capabilities ?? []
      if (activeFilter === "all") return true
      if (activeFilter === "vision") return caps.includes("vision") || /vl|vision|gemini|gpt-4o|claude/i.test(model.id)
      if (activeFilter === "tools") return caps.includes("tools") && !/imagine-image|imagine-video/i.test(model.id)
      if (activeFilter === "reasoning") return caps.includes("reasoning") || /r1|o1|o3|o4|reasoning|thinking/i.test(model.id)
      if (activeFilter === "media") return caps.includes("image") || caps.includes("video") || /imagine|dall-e|flux|sdxl|video/i.test(model.id)
      if (activeFilter === "embeddings") return caps.includes("embedding") || caps.includes("rerank") || /embed|rerank/i.test(model.id)
      return true
    })
  }, [configuredModels, activeFilter, search])

  // 3. 一键切换默认模型
  async function handleSetDefaultModel(model: ModelOption) {
    setModel(model.id, model.label, model.provider, model.reasoningEffort)
    if (hasIde()) {
      try {
        const snapshot = (await getIde().settings.setActiveModel({
          providerId: model.providerId,
          modelId: model.id
        })) as SettingsSnapshot
        await applySettingsSnapshot(snapshot)
      } catch {
        await getIde().settings.setDefaultModel({ modelId: model.id })
      }
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
      await queryClient.invalidateQueries({ queryKey: ["models"] })
    }
  }

  // 4. 触发动态能力探测
  async function handleProbe() {
    if (!hasIde() || !activeModel.providerId) return
    setProbing(true)
    try {
      await getIde().settings.probeProvider({ id: activeModel.providerId, kind: activeModel.provider })
      await queryClient.invalidateQueries({ queryKey: ["models"] })
      await queryClient.invalidateQueries({ queryKey: ["settings"] })
    } finally {
      setProbing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 当前默认模型看板 (Active Model Hero Pulse Card) ─── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default p-2">
              <ModelBrandIcon
                modelId={activeModel.id}
                providerKind={activeModel.provider}
                apiStyle={activeModel.apiStyle}
                size={26}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-title-3-semibold text-text-primary">
                  {activeModel.label || activeModel.id}
                </span>
                <span className="rounded-md border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-caption-2-semibold font-semibold text-accent-600 dark:text-accent-400">
                  {t("settings.capabilities.activeMain")}
                </span>
                {activeModel.providerName ? (
                  <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-tertiary">
                    {activeModel.providerName}
                  </span>
                ) : null}
              </div>
              <span className="font-mono text-caption-2-regular text-text-tertiary mt-0.5">
                {activeModel.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleProbe()}
              disabled={probing}
              className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium"
            >
              <span>{probing ? t("settings.capabilities.probing") : t("settings.capabilities.probe")}</span>
            </Button>
          </div>
        </div>

        {/* 核心能力徽标网格 */}
        <div className="mt-3 pt-3 border-t border-separator-border flex flex-wrap items-center gap-2">
          {activeModel.capabilities && activeModel.capabilities.length > 0 ? (
            activeModel.capabilities.map((cap) => (
              <CapabilityBadge key={cap} capability={cap} />
            ))
          ) : (
            <span className="text-caption-2-regular text-text-tertiary">
              {t("settings.capabilities.staticHint")}
            </span>
          )}
        </div>
      </div>

      <SettingsCard title={t("settings.capabilities.matrixTitle")}>
        {/* 筛选与搜索工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 pb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterPill
              active={activeFilter === "all"}
              label={t("settings.capabilities.allModels", { count: configuredModels.length })}
              onClick={() => setActiveFilter("all")}
            />
            <FilterPill
              active={activeFilter === "tools"}
              icon={RiToolsLine}
              label={t("settings.capabilities.filterTools")}
              onClick={() => setActiveFilter("tools")}
            />
            <FilterPill
              active={activeFilter === "vision"}
              icon={RiEyeLine}
              label={t("settings.capabilities.filterVision")}
              onClick={() => setActiveFilter("vision")}
            />
            <FilterPill
              active={activeFilter === "reasoning"}
              icon={RiMentalHealthLine}
              label={t("settings.capabilities.filterReasoning")}
              onClick={() => setActiveFilter("reasoning")}
            />
            <FilterPill
              active={activeFilter === "media"}
              icon={RiImageLine}
              label={t("settings.capabilities.filterMedia")}
              onClick={() => setActiveFilter("media")}
            />
            <FilterPill
              active={activeFilter === "embeddings"}
              icon={RiGitBranchLine}
              label={t("settings.capabilities.filterEmbeddings")}
              onClick={() => setActiveFilter("embeddings")}
            />
          </div>

          <div className="relative w-full max-w-[220px]">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("settings.capabilities.searchPlaceholder")}
              className="h-8 w-full rounded-lg border border-border-button-default bg-background-secondary-default pl-8 pr-2.5 text-caption-2-regular text-text-primary outline-none focus:border-border-focus-ring"
            />
          </div>
        </div>

        {/* 模型列表 */}
        <div className="flex flex-col divide-y divide-separator-border mt-1">
          {filteredModels.length > 0 ? (
            filteredModels.map((model) => (
              <ModelCapabilityRow
                key={model.id}
                model={model}
                isDefault={model.id === defaultModelId}
                onSetDefault={(m) => void handleSetDefaultModel(m)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-background-secondary-default text-text-tertiary mb-2">
                <RiInformationLine className="size-5" />
              </div>
              <p className="text-caption-1-medium text-text-primary">{t("settings.capabilities.empty")}</p>
              <p className="text-caption-2-regular text-text-tertiary mt-0.5">
                {t("settings.capabilities.emptyHint")}
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* ─── Vercel AI SDK 7 能力速查指南 ───────────────────── */}
      <SettingsCard title={t("settings.capabilities.specsTitle")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
          <CapabilityGuideItem
            title={t("settings.capabilities.guideTools")}
            badge="tools"
            desc={t("settings.capabilities.guideToolsDesc")}
          />
          <CapabilityGuideItem
            title={t("settings.capabilities.guideVision")}
            badge="vision"
            desc={t("settings.capabilities.guideVisionDesc")}
          />
          <CapabilityGuideItem
            title={t("settings.capabilities.guideStructured")}
            badge="structured"
            desc={t("settings.capabilities.guideStructuredDesc")}
          />
          <CapabilityGuideItem
            title={t("settings.capabilities.guideReasoning")}
            badge="reasoning"
            desc={t("settings.capabilities.guideReasoningDesc")}
          />
        </div>
      </SettingsCard>
    </div>
  )
}

function FilterPill({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean
  icon?: typeof RiToolsLine
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-caption-2-medium transition-colors cursor-pointer",
        active
          ? "bg-accent-500 text-white font-semibold shadow-2xs"
          : "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      <span>{label}</span>
    </button>
  )
}
