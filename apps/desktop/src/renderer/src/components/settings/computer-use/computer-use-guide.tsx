/**
 * 电脑操控入门。可折叠，不新开教程路由。
 */
import { useT } from "@renderer/i18n"

export function ComputerUseGuide() {
  const t = useT()
  return (
    <details className="rounded-2xl border border-border-button-default bg-background-primary-default px-5 py-4">
      <summary className="cursor-pointer text-body-medium text-text-primary">{t("settings.computerUse.guideTitle")}</summary>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-caption-1-medium text-text-secondary">
        <li>{t("settings.computerUse.guideStart")}</li>
        <li>{t("settings.computerUse.guideApprove")}</li>
        <li>{t("settings.computerUse.guideStop")}</li>
      </ol>
    </details>
  )
}
