/**
 * command 表面：工作目录 + 即将执行的 shell。
 * 最多 4 行 + 渐隐；超过才出「展开全部（共 {n} 字）」，展开后最高 40% 会话区、区内滚动（luna #144）。
 */
import { useCallback, useLayoutEffect, useState } from "react"
import { useT } from "@renderer/i18n"
import { estimateCommandOverflow, renderCommandBlock } from "./approval-command-collapse"

export function ApprovalCommandBody({ cwd, command }: { cwd: string; command: string }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(() => estimateCommandOverflow(command))
  const [pre, setPre] = useState<HTMLPreElement | null>(null)

  useLayoutEffect(() => {
    setExpanded(false)
  }, [command])

  useLayoutEffect(() => {
    if (!pre || expanded) return
    const measure = () => setOverflowing(pre.scrollHeight > pre.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(pre)
    return () => observer.disconnect()
  }, [pre, expanded, command])

  const onToggle = useCallback(() => setExpanded((value) => !value), [])
  return renderCommandBlock({ cwd, command, expanded, overflowing, t, onToggle, preRef: setPre })
}
