/**
 * CLI 智能体模型列表与检索
 * 参考 monocode 紧凑设计，单选行高对比度、无多余灰色背景。
 */
import { useMemo, useState } from "react"
import type { AgentCliModel, AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { RiCheckLine, RiSearchLine, RiSparkling2Line } from "@remixicon/react"

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
      (m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
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
      {/* 搜索行：内联极简无边框设计 */}
      <div className="flex items-center gap-2 border-b border-separator-border bg-background-secondary-default/20 px-3.5 py-2 text-text-tertiary">
        <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`搜索 ${agent.label} 模型...`}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>

      {/* 模型列表 */}
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {filteredModels.map((model) => {
          const selected = model.id === agent.selectedModel
          const isThinking = model.label.toLowerCase().includes("thinking") || model.id.includes("thinking")
          return (
            <li key={model.id}>
              <button
                type="button"
                onClick={() => onPick(model)}
                className={`group flex min-h-[34px] w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                  selected
                    ? "bg-accent-500/10 font-semibold text-accent-700 dark:text-accent-300 ring-1 ring-accent-500/25"
                    : "text-text-primary hover:bg-background-secondary-hover/70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[12px]">{model.label}</span>
                  {isThinking ? (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      <RiSparkling2Line className="size-2.5" />
                      思考
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[10px] text-text-tertiary">
                    {model.id}
                  </span>
                  {selected ? (
                    <RiCheckLine className="size-3.5 text-accent-500 shrink-0" />
                  ) : null}
                </div>
              </button>
            </li>
          )
        })}

        {filteredModels.length === 0 ? (
          <li className="py-6 text-center text-caption-2-medium text-text-tertiary">
            未找到匹配模型
          </li>
        ) : null}
      </ul>
    </div>
  )
}
