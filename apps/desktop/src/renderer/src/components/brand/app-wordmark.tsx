/**
 * 组合标字锁：enjoy + AGENT IDE。不使用 lockup SVG（带 Paper/Pitch 满底，不能嵌进铬）。
 */
import { cx } from "@/utils/cx"
import { WORDMARK, WORDMARK_SUB } from "./constants"

export function AppWordmark({ className }: { className?: string }) {
  return (
    <span className={cx("flex min-w-0 flex-col justify-center", className)}>
      <span className="text-caption-1-semibold text-text-primary tracking-tight">{WORDMARK}</span>
      <span className="font-mono text-caption-2-medium tracking-widest text-text-tertiary">
        {WORDMARK_SUB}
      </span>
    </span>
  )
}
