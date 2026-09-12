/**
 * 绑定下拉外的次级链：去模型供应商页建档案。
 * 禁止把「+ 添加 {品牌} 供应商」塞进菜单冒充选项。
 */
import { RiArrowRightSLine } from "@remixicon/react"
import { useNavigate } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function AgentToolAddArchiveLink({ empty }: { empty: boolean }) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void navigate({ to: "/settings/$section", params: { section: "providers" } })}
        className={cx(
          "inline-flex w-fit items-center gap-0.5 text-caption-2-medium text-accent-600 outline-none hover:text-accent-500 focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          empty && "rounded-lg bg-accent-500/10 px-2 py-1"
        )}
      >
        {t("settings.agentTools.addArchiveLink")}
        <RiArrowRightSLine className="size-3.5" />
      </button>
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.addArchiveHint")}</p>
    </div>
  )
}
