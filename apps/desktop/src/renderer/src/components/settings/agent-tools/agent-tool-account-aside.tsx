/**
 * 绑了 Enjoy 档案后的官方登录旁注：虚线盒，不当英雄卡，不摊邮箱。
 */
import { useT } from "@renderer/i18n"

export function AgentToolAccountAside({
  loading: _loading
}: {
  tool?: unknown
  loading?: boolean
}) {
  const t = useT()
  return (
    <section className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/40 px-3 py-2.5">
      <p className="text-caption-1-medium text-text-primary">{t("settings.agentTools.officialAccountAside")}</p>
      <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
        {t("settings.agentTools.officialAccountAsideHint")}
      </p>
    </section>
  )
}
