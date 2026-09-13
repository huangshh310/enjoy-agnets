import { Outlet, useNavigate, useParams } from "@tanstack/react-router"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import {
  getSettingsNav,
  isSettingsSectionId,
  resolveActiveNavSectionId,
  type SettingsSectionId
} from "./settings-catalog"

export function SettingsShell() {
  const navigate = useNavigate()
  const t = useT()
  const params = useParams({ strict: false }) as { section?: string }
  const section = isSettingsSectionId(params.section ?? "")
    ? (params.section as SettingsSectionId)
    : "general"

  return (
    <SecondaryPageShell
      searchPlaceholder={t("common.searchSettings")}
      groups={getSettingsNav(t)}
      selectedId={resolveActiveNavSectionId(section)}
      contentWidth="stage"
      hideChrome
      onSelect={(id) => void navigate({ to: "/settings/$section", params: { section: id } })}
    >
      <Outlet />
    </SecondaryPageShell>
  )
}
