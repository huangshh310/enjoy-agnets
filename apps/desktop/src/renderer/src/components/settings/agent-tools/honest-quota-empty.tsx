/**
 * 无公开额度 API 或 inspect 未返回数字时的诚实空态，禁止空进度条。
 */
import { useT } from "@renderer/i18n"

export function HonestQuotaEmpty({ reason }: { reason: "no-api" | "no-data" }) {
  const t = useT()
  return (
    <p className="rounded-lg bg-background-secondary-default/50 px-2.5 py-1.5 text-caption-2-medium text-text-tertiary">
      {reason === "no-api" ? t("settings.agentTools.quotaNoApi") : t("settings.agentTools.quotaNone")}
    </p>
  )
}
