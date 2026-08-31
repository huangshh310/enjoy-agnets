/**
 * 状态行 + 失败重试。皮是 BoardUI token，不是 BeUI 默认 muted。
 */
import { RiRefreshLine } from "@remixicon/react"
import { AnimatePresence, motion, type Transition } from "motion/react"
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { DitherMark } from "./dither-mark"
import { STATUS_TEXT, type ImageGenerationStatus } from "./image-generation.types"

export function ImageGenerationStatusRow({
  status,
  statusText,
  prompt,
  reduce,
  className,
  onRetry
}: {
  status: ImageGenerationStatus
  statusText?: string
  prompt?: string
  reduce: boolean
  className?: string
  onRetry?: () => void
}) {
  const resolved = statusText ?? STATUS_TEXT[status]
  return (
    <div className="mt-3 text-left">
      <div
        aria-live="polite"
        className={cn(
          "flex min-h-5 items-center gap-2 text-body-medium text-text-primary",
          status === "error" && "text-text-error-primary",
          className
        )}
      >
        <DitherMark status={status} reduce={reduce} />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={resolved}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.15, ease: EASE_OUT } as Transition}
          >
            {resolved}
          </motion.span>
        </AnimatePresence>
      </div>
      {prompt ? (
        <p className="mt-0.5 truncate text-caption-2-medium text-text-tertiary">“{prompt}”</p>
      ) : null}
      {status === "error" && onRetry ? (
        <motion.button
          type="button"
          onClick={onRetry}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={SPRING_PRESS}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-body-medium text-text-primary outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiRefreshLine aria-hidden="true" className="size-4" />
          Try again
        </motion.button>
      ) : null}
    </div>
  )
}
