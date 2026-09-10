/**
 * 信任声明卡：一句话确认，不是单独开关。
 */
import { RiCheckLine, RiShieldCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function McpTrustConfirm({
  onCancel,
  onConfirm
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()
  return (
    <div className="mt-2.5 flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-start gap-2.5">
        <RiShieldCheckLine className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <h5 className="text-caption-1-medium font-semibold text-text-primary">
            {t("pages.mcp.trustSentence")}
          </h5>
          <p className="mt-0.5 text-caption-2-regular text-text-secondary">{t("pages.mcp.trustNotice")}</p>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" className="h-6.5 px-2.5 text-caption-2-medium" onClick={onCancel}>
          {t("pages.mcp.dontTrust")}
        </Button>
        <Button
          size="sm"
          data-testid="mcp-trust-confirm"
          className="h-6.5 gap-1 px-3 text-caption-2-medium"
          onClick={onConfirm}
        >
          <RiCheckLine className="size-3" />
          <span>{t("pages.mcp.trust")}</span>
        </Button>
      </div>
    </div>
  )
}
