/**
 * 阶段总结：生成入库，下一轮才垫进模型。失败要写出来，不能吞掉。
 */
import { RiLoader4Line, RiSparkling2Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function SessionRecapButton({
  recap,
  recapping,
  error,
  onGenerate
}: {
  recap: string
  recapping: boolean
  error?: string | null
  onGenerate: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onGenerate}
        disabled={recapping}
        title={recap ? `${t("chat.recapTooltipPrefix")}\n${recap}` : t("chat.generateRecapTitle")}
        className="inline-flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 text-left text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-secondary disabled:opacity-50"
      >
        {recapping ? (
          <RiLoader4Line className="size-3.5 shrink-0 animate-spin text-accent-500" />
        ) : (
          <RiSparkling2Line className="size-3.5 shrink-0 text-accent-500" />
        )}
        <span className="text-caption-2-medium">{t("chat.generateRecap")}</span>
      </button>
      {error ? (
        <p className="px-2 text-caption-2-regular text-text-warning-primary">{error}</p>
      ) : recap ? (
        <p className="line-clamp-3 px-2 text-caption-2-regular text-text-tertiary" title={recap}>
          {recap}
        </p>
      ) : null}
    </div>
  )
}
