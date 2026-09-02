"use client"

import { RiFolder6Line, RiGitBranchLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AgentLimitsCard } from "./agent-limits/agent-limits-card"
import { useT } from "@renderer/i18n"


export function AiChatStatusBar({
  workspaceRootLabel,
  contextUsed
}: {
  workspaceRootLabel: string
  contextUsed: number
}) {
  const navigate = useNavigate()
  const t = useT()
  return (
    <div className="flex items-center gap-3 px-8 pb-4 text-caption-1-medium text-text-tertiary">
      <span className="inline-flex items-center gap-1">
        <RiGitBranchLine className="size-3.5" aria-hidden />
        Main
      </span>
      <span className="inline-flex items-center gap-1">
        <RiFolder6Line className="size-3.5" aria-hidden />
        {workspaceRootLabel}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={t("chat.contextTokensHint")}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full py-0.5 px-2 text-caption-1-medium text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500/20"
          >
            <ContextRing value={contextUsed} />
            <span className="font-medium font-mono">{contextUsed}%</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="p-0 border-none bg-transparent shadow-none w-auto"
        >
          <AgentLimitsCard
            onManagePlan={() =>
              void navigate({
                to: "/settings/$section",
                params: { section: "providers" }
              })
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ContextRing({ value }: { value: number }) {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="text-border-button-default" />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="origin-center -rotate-90 text-text-primary"
      />
    </svg>
  )
}
