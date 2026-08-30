"use client"

import { RiFolder6Line, RiGitBranchLine } from "@remixicon/react"

export function AiChatStatusBar({
  workspaceRootLabel,
  contextUsed
}: {
  workspaceRootLabel: string
  contextUsed: number
}) {
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
      <span className="ml-auto inline-flex items-center gap-2">
        <ContextRing value={contextUsed} />
        {contextUsed}%
      </span>
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
