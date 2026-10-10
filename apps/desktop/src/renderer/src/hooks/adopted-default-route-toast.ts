/**
 * 第一次从无到有才 toast。文案走 i18n，不改时长、不带动作。
 */
import { showAppToast } from "../lib/app-toast.ts"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"

let toastedAdoptedName: string | undefined

export function resetAdoptedDefaultRouteToast(): void {
  toastedAdoptedName = undefined
}

export function consumeAdoptedHint(name: string | undefined): string | undefined {
  if (!name || toastedAdoptedName === name) return undefined
  toastedAdoptedName = name
  return name
}

export function adoptedDefaultRouteToastMessage(
  name: string,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  return t("chat.adoptedDefaultRouteToast", { name })
}

function toastTranslator(): (path: string, vars?: Record<string, string | number>) => string {
  const language = (
    queryClient.getQueryData(["settings"]) as
      | { preferences?: { language?: LanguagePref } }
      | undefined
  )?.preferences?.language ?? "zh"
  const messages = resolveLocale(language) === "en" ? en : zh
  return (path, vars) => translate(messages, path, vars)
}

export function notifyAdoptedDefaultRoute(name: string): void {
  showAppToast(adoptedDefaultRouteToastMessage(name, toastTranslator()), {
    testId: "adopted-default-route-toast"
  })
}
