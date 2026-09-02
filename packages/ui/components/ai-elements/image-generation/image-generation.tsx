/**
 * BeUI 生图表面：稳定画布 + 渐进揭示。抄交互，BoardUI 换皮。
 */
import { AnimatePresence, motion, type Transition } from "motion/react"
import { useReducedMotion } from "motion/react"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { useUiLocale } from "@/i18n/ui-locale"
import { DitherField } from "./dither-field"
import { ImageGenerationStatusRow } from "./image-generation-status"
import { MEDIA_STATE, STATUS_TEXT, type ImageGenerationFrameProps, type ImageGenerationProps } from "./image-generation.types"

export function ImageGeneration({
  children,
  status = "generating",
  label,
  prompt,
  resolution,
  aspectRatio = "1 / 1",
  size = "fluid",
  interactive = true,
  statusText,
  showStatus = true,
  onRetry,
  className,
  mediaClassName,
  statusClassName
}: ImageGenerationProps) {
  useUiLocale()
  const reduce = useReducedMotion() ?? false
  const active = status === "queued" || status === "generating" || status === "refining"
  const mediaState = MEDIA_STATE[status]
  const resolvedStatus = statusText ?? STATUS_TEXT(status)
  const resolvedLabel = label ?? (prompt ? `${resolvedStatus}: ${prompt}` : resolvedStatus)

  return (
    <div data-slot="image-generation" data-state={status} aria-busy={active} className={cn("w-full", className)}>
      <div className={cn("w-full", size === "compact" && "mx-auto max-w-52")}>
        <ImageGenerationFrame
          label={resolvedLabel}
          aspectRatio={aspectRatio}
          reduce={reduce}
          mediaState={mediaState}
          mediaClassName={mediaClassName}
          active={active}
          interactive={interactive}
          status={status}
          resolution={resolution}
        >
          {children}
        </ImageGenerationFrame>
        {showStatus || prompt ? (
          <ImageGenerationStatusRow
            status={status}
            statusText={statusText}
            prompt={prompt}
            reduce={reduce}
            className={statusClassName}
            onRetry={onRetry}
          />
        ) : null}
      </div>
    </div>
  )
}

function ImageGenerationFrame({
  children,
  label,
  aspectRatio,
  reduce,
  mediaState,
  mediaClassName,
  active,
  interactive,
  status,
  resolution
}: ImageGenerationFrameProps) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ aspectRatio }}
      className="relative isolate w-full overflow-hidden rounded-2xl bg-background-secondary-default"
    >
      <motion.div
        aria-hidden={children ? undefined : true}
        initial={false}
        animate={
          reduce
            ? { opacity: mediaState.opacity }
            : { filter: mediaState.filter, opacity: mediaState.opacity, scale: mediaState.scale }
        }
        transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT } as Transition}
        className={cn(
          "absolute inset-0 *:size-full *:object-cover [&_img]:size-full [&_img]:object-cover [&_button]:size-full [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0",
          mediaClassName
        )}
      >
        {children}
      </motion.div>
      <AnimatePresence initial={false}>
        {active ? (
          <motion.div
            key="dither-field"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
            className="absolute inset-0"
          >
            <DitherField interactive={interactive} reduce={reduce} status={status} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {resolution ? (
        <span className="absolute top-2 right-2 z-10 rounded-full bg-background-primary-default/80 px-2 py-0.5 font-mono text-caption-2-medium tabular-nums text-text-tertiary">
          {resolution}
        </span>
      ) : null}
    </div>
  )
}
