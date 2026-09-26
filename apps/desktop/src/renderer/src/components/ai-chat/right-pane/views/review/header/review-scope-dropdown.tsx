/**
 * 审查作用域下拉选单组件：
 * 对齐 Codex 作用域，并加 Enjoy 写盘检查点。
 */

import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { REVIEW_SCOPES } from "../constants/review-constants"
import type { ReviewScope } from "../types/review.types"

export function ReviewScopeDropdown(props: {
  scope: ReviewScope
  onSelectScope: (scope: ReviewScope) => void
}) {
  const { scope, onSelectScope } = props
  const currentScopeItem = REVIEW_SCOPES.find((s) => s.id === scope) ?? REVIEW_SCOPES[5]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-body-medium font-semibold text-text-primary hover:bg-background-secondary-hover cursor-pointer transition-colors"
        >
          <span>{currentScopeItem.label}</span>
          <RiArrowDownSLine className="size-4 text-text-tertiary group-hover:text-text-primary transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-1">
        {REVIEW_SCOPES.map((item) => {
          const isSelected = item.id === scope
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => onSelectScope(item.id)}
              className="flex items-center justify-between py-1.5 px-2 text-caption-1-medium cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium text-text-primary">{item.label}</span>
                <span className="text-caption-2-regular text-text-tertiary">{item.desc}</span>
              </div>
              {isSelected ? (
                <RiCheckLine className="size-4 shrink-0 text-accent-500" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
