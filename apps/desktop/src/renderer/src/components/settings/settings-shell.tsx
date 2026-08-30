import { Outlet, useNavigate, useParams } from "@tanstack/react-router"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { SETTINGS_NAV, isSettingsSectionId, type SettingsSectionId } from "./settings-catalog"

export function SettingsShell() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { section?: string }
  const section = isSettingsSectionId(params.section ?? "")
    ? (params.section as SettingsSectionId)
    : "general"

  return (
    <SecondaryPageShell
      searchPlaceholder="Search settings..."
      groups={SETTINGS_NAV}
      selectedId={section}
      onSelect={(id) => void navigate({ to: "/settings/$section", params: { section: id } })}
    >
      <Outlet />
    </SecondaryPageShell>
  )
}
