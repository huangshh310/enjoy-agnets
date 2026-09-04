/**
 * 旧 Hash 并入 Settings 的 beforeLoad 工厂，避免 router 里拷十余份 redirect。
 */
import { redirect } from "@tanstack/react-router"
import type { SettingsSectionId } from "@renderer/components/settings/settings-catalog"

export function RedirectPlaceholder() {
  return null
}

export function settingsBeforeLoad(section: SettingsSectionId) {
  return () => {
    throw redirect({ to: "/settings/$section", params: { section } })
  }
}

export function mappedSettingsBeforeLoad(map: (section: string) => SettingsSectionId) {
  return ({ params }: { params: { section: string } }) => {
    throw redirect({ to: "/settings/$section", params: { section: map(params.section) } })
  }
}
