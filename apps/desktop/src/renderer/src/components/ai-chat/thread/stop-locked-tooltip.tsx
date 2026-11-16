/**
 * luna C1b：本会话收尾没落定（正在停下 / 没能停下）时，会开新一轮的入口保持可见、置灰（aria-disabled），
 * 悬停给「停干净后再试」。不用原生 disabled：禁用按钮收不到指针事件，tooltip 出不来。点击由入口函数再挡一层。
 */
import type { ReactElement } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export const STOP_LOCKED_CLASS = "cursor-not-allowed opacity-40 hover:bg-transparent"

export function StopLockedTooltip({ locked, hint, children }: { locked: boolean; hint: string; children: ReactElement }) {
  if (!locked) return children
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{hint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
