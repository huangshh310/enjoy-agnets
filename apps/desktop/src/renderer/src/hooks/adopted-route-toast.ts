/**
 * 第一次自动收默认路线时弹一次人话 toast。同一 name 不重复。
 */
import { showAppToast } from "../lib/app-toast.ts"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"

let toastedAdoptedName: string | undefined

export function notifyAdoptedDefaultRoute(name: string): void {
  if (!name || toastedAdoptedName === name) return
  toastedAdoptedName = name
  const language =
    (
      queryClient.getQueryData(["settings"]) as
        | { preferences?: { language?: LanguagePref } }
        | undefined
    )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  showAppToast(translate(messages, "chat.adoptedDefaultRouteToast", { name }), {
    id: "adopted-default-route",
    testId: "adopted-default-route-toast"
  })
}
