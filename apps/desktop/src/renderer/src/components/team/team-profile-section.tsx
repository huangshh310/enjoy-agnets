/**
 * 团队资料：本地单机，没有云端组织。个人中心在 #/settings/account。
 */
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { LocalOnlyNotice } from "@renderer/components/settings/local-only-notice"
import { useT } from "@renderer/i18n"

export function TeamProfileSection() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <LocalOnlyNotice
      title={t("settings.localTeam.title")}
      body={t("settings.localTeam.body")}
      action={
        <Button
          size="sm"
          onClick={() => void navigate({ to: "/settings/$section", params: { section: "account" } })}
        >
          {t("settings.localTeam.openProfile")}
        </Button>
      }
    />
  )
}
