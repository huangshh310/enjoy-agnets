/**
 * CLI 智能体模型列表与检索。右侧 id 必须有列宽，避免被浮层边框切掉。
 */
import { useMemo, useState } from "react"
import type { AgentCliModel, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiCheckLine, RiSearchLine, RiSparkling2Line } from "@remixicon/react"
import { AgentBrandIcon } from "./agent-brand-icon"

export function AgentCliModels({
  agent,
  onPick
}: {
  agent: AgentToolPublic
  onPick: (model: AgentCliModel) => void
}) {
  const [query, setQuery] = useState("")
  const filteredModels = useMemo(() => {
    if (!query.trim()) return agent.models
    const q = query.toLowerCase()
    return agent.models.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    )
  }, [agent.models, query])

  if (agent.models.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-caption-1-medium text-text-tertiary">
        未找到该 CLI 汇报的可用模型
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-separator-border bg-background-secondary-default/20 px-3.5 py-2 text-text-tertiary">
        <RiSearchLine className="size-3.5 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`搜索 ${agent.label} 模型...`}
          className="min-w-0 flex-1 bg-transparent text-caption-1-regular text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-1.5">
        {filteredModels.map((model) => (
          <li key={model.id} className="min-w-0">
            <CliModelRow
              agentId={agent.id}
              model={model}
              selected={model.id === agent.selectedModel}
              onPick={onPick}
            />
          </li>
        ))}
        {filteredModels.length === 0 ? (
          <li className="py-6 text-center text-caption-2-medium text-text-tertiary">未找到匹配模型</li>
        ) : null}
      </ul>
    </div>
  )
}

function CliModelRow({
  agentId,
  model,
  selected,
  onPick
}: {
  agentId: string
  model: AgentCliModel
  selected: boolean
  onPick: (model: AgentCliModel) => void
}) {
  const thinking =
    model.label.toLowerCase().includes("thinking") || model.id.toLowerCase().includes("thinking")
  const showId = model.id !== model.label
  return (
    <button
      type="button"
      title={showId ? `${model.label} · ${model.id}` : model.label}
      onClick={() => onPick(model)}
      className={`flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2.5 py-1.5 text-left transition-colors ${
        selected
          ? "bg-accent-500/10 text-accent-700 ring-1 ring-accent-500/25 dark:text-accent-300"
          : "text-text-primary hover:bg-background-secondary-hover/70"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex size-4 shrink-0 items-center justify-center">
          <AgentBrandIcon id={agentId} size={15} />
        </span>
        <span className="min-w-0 truncate text-caption-1-medium">{model.label}</span>
        {thinking ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 text-caption-2-medium text-amber-700 dark:text-amber-300">
            <RiSparkling2Line className="size-2.5" />
            思考
          </span>
        ) : null}
      </span>
      {showId ? (
        <span className="w-36 shrink-0 truncate text-right font-mono text-caption-2-medium text-text-tertiary">
          {model.id}
        </span>
      ) : null}
      <span className="flex w-3.5 shrink-0 justify-end">
        {selected ? <RiCheckLine className="size-3.5 text-accent-500" /> : null}
      </span>
    </button>
  )
}
