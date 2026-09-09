/**
 * 空态缺口行：品牌 + 名 + 一个紧凑 CTA。命令行内展开，完整安装走设置 Registry。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "../../agent-picker/agent-brand-icon"
import { pickMissingCta } from "./empty-state-checklist-model"
import { missingCtaLabel, runMissingCta } from "./empty-state-missing-actions"

export function EmptyStateMissingRow({ agent }: { agent: AgentToolPublic }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const kind = pickMissingCta(agent)

  async function onCta() {
    await runMissingCta({
      kind,
      agent,
      onBusy: setBusy,
      onCopied: setCopied,
      onExpand: () => setExpanded(true),
      onInstalled: () => {
        void queryClient.invalidateQueries({ queryKey: ["settings"] })
      }
    })
  }

  return (
    <li className="flex flex-col">
      <div className="flex min-h-8 items-center gap-2 rounded-lg px-1.5 hover:bg-background-secondary-hover">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-caption-1-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <AgentBrandIcon id={agent.id} size={14} />
          <span className="truncate">{agent.label}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCta()}
          className="shrink-0 rounded-full px-2.5 py-0.5 text-caption-2-medium text-accent-500 outline-none hover:bg-background-primary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:opacity-50"
        >
          {missingCtaLabel(kind, { busy, copied, t })}
        </button>
      </div>
      {expanded ? <MissingCommandPanel command={agent.installCommand} /> : null}
    </li>
  )
}

function MissingCommandPanel({ command }: { command: string }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div className="mt-0.5 flex flex-col gap-1 pb-1.5 pl-7 pr-1.5">
      {command ? <p className="font-mono text-caption-2-medium text-text-tertiary">{command}</p> : null}
      <button
        type="button"
        onClick={() => {
          void navigate({
            to: "/settings/$section",
            params: { section: "agent" },
            search: { tab: "registry" }
          })
        }}
        className="self-start text-caption-2-medium text-accent-500 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {t("chat.emptyOpenRegistry")}
      </button>
    </div>
  )
}
