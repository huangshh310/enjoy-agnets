/**
 * 第一次从无到有才 toast。queryFn 可能早于 Toaster 挂上，先入队，
 * renderer mount + rAF 后再 showAppToast。文案走 i18n，不改时长、不带动作。
 */
import { showAppToast } from "../lib/app-toast.ts"
import { en } from "../i18n/catalogs/en/index.ts"
import { zh } from "../i18n/catalogs/zh/index.ts"
import { resolveLocale, type LanguagePref } from "../i18n/locale.ts"
import { translate } from "../i18n/lookup.ts"
import { queryClient } from "../lib/query-client.ts"

let toastedAdoptedName: string | undefined
let pendingAdoptedName: string | undefined
let rendererReady = false
let flushScheduled = false

export function resetAdoptedDefaultRouteToast(): void {
  toastedAdoptedName = undefined
  pendingAdoptedName = undefined
  rendererReady = false
  flushScheduled = false
}

export function consumeAdoptedHint(name: string | undefined): string | undefined {
  if (!name || toastedAdoptedName === name) return undefined
  toastedAdoptedName = name
  return name
}

export function pendingAdoptedDefaultRouteName(): string | undefined {
  return pendingAdoptedName
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

/** 快照到达时只入队，不要在 queryFn 里立刻 toast。 */
export function queueAdoptedDefaultRoute(name: string | undefined): void {
  const next = consumeAdoptedHint(name)
  if (!next) return
  pendingAdoptedName = next
  if (rendererReady) scheduleFlush()
}

/** Toaster 与路由同树挂上后再刷。同一会话只标一次。 */
export function markAdoptToastRendererReady(): void {
  if (rendererReady) return
  rendererReady = true
  if (pendingAdoptedName) scheduleFlush()
}

export function flushAdoptedDefaultRouteToast(): void {
  const name = pendingAdoptedName
  pendingAdoptedName = undefined
  if (!name) return
  notifyAdoptedDefaultRoute(name)
}

function scheduleFlush(): void {
  if (flushScheduled) return
  flushScheduled = true
  const raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => setTimeout(cb, 0)
  raf(() => {
    flushScheduled = false
    flushAdoptedDefaultRouteToast()
  })
}
