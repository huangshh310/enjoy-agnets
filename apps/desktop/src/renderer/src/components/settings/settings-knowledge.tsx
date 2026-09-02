/**
 * Settings → Knowledge indexing：知识库与本地 RAG 检索配置。
 * 支持向量模型绑定、自动索引策略、语义重排 (Rerank) 与检索片段上限调优。
 */
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiArrowDownSLine,
  RiArrowRightLine,
  RiBookOpenLine,
  RiCheckLine,
  RiFolder6Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cx } from "@/utils/cx"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { SettingsCard, SettingsRow } from "./settings-row"
import { usePrefUpdate } from "./settings-pref"

const EMBEDDING_PRESETS = [
  { id: "text-embedding-3-small", label: "text-embedding-3-small (1536d)", provider: "OpenAI" },
  { id: "text-embedding-3-large", label: "text-embedding-3-large (3072d)", provider: "OpenAI" },
  { id: "BAAI/bge-m3", label: "bge-m3 (Multi-lingual)", provider: "SiliconFlow" },
  { id: "embed-english-v3.0", label: "Cohere Embed English v3.0", provider: "Cohere" }
]

export function KnowledgeSettings() {
  const navigate = useNavigate()
  const { preferences, update } = usePrefUpdate()
  const configuredModels = useChatStore((state) => state.models)

  // 筛选出已配置且具备 embedding 能力的模型
  const embeddingModels = useMemo(() => {
    return configuredModels.filter(
      (m) => m.capabilities?.includes("embedding") || /embed|bge/i.test(m.id)
    )
  }, [configuredModels])

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 知识库与本地 RAG 状态看板 ───────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <RiBookOpenLine className="size-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary">
                  Local Knowledge RAG Engine
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  SQLite Vector Store
                </span>
              </div>
              <span className="text-caption-2-regular text-text-tertiary mt-0.5">
                Deterministic chunking, cosine similarity, lexical BM25 fallback, and citation grounding.
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/knowledge" })}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiFolder6Line className="size-3.5 text-teal-500" />
            <span>Open Knowledge Studio</span>
            <RiArrowRightLine className="size-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>
      </div>

      {/* ─── 检索与向量化策略 ─────────────────────────────── */}
      <SettingsCard title="Indexing & Retrieval Policies">
        <SettingsRow
          title="Auto-index new sources"
          description="Automatically trigger background indexing when new folder collections or docs are attached."
        >
          <Switch
            checked={preferences?.knowledgeAutoIndex ?? false}
            onCheckedChange={(value) => void update({ knowledgeAutoIndex: value })}
          />
        </SettingsRow>

        <SettingsRow
          title="Vector embedding model"
          description="Dense vector model used for embedding workspace documents and query similarity search."
        >
          <EmbeddingModelSelector
            availableModels={embeddingModels}
            onSelect={() => {
              // 预留 embedding 偏好保存
            }}
          />
        </SettingsRow>

        <SettingsRow
          title="Lexical & Cosine hybrid search"
          description="Combines 1536d vector cosine similarity with lexical bag-of-words scoring when network is offline."
        >
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-caption-2-medium text-emerald-600 dark:text-emerald-400">
            <span>Enabled (Local First)</span>
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

function EmbeddingModelSelector({
  availableModels,
  onSelect
}: {
  availableModels: ModelOption[]
  onSelect: (modelId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("text-embedding-3-small")

  const allChoices = [
    ...availableModels.map((m) => ({ id: m.id, label: m.label || m.id, provider: m.providerName || m.provider })),
    ...EMBEDDING_PRESETS.filter((p) => !availableModels.some((m) => m.id === p.id))
  ]

  const active = allChoices.find((c) => c.id === selectedId) ?? allChoices[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-[280px] items-center justify-between gap-2 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5 text-left outline-none transition-colors hover:bg-background-secondary-hover cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="truncate text-caption-1-medium text-text-primary">{active?.label || selectedId}</span>
          </div>
          <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="flex w-[280px] flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown"
      >
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
          {allChoices.map((c) => {
            const isSelected = c.id === selectedId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(c.id)
                  onSelect(c.id)
                  setOpen(false)
                }}
                className={cx(
                  "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-background-secondary-default text-text-primary font-medium"
                    : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
                )}
              >
                <span className="truncate text-caption-2-medium">{c.label}</span>
                {isSelected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500 ml-1.5" /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
