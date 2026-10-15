/**
 * 余额不足 / 没权限的提示条。createElement 写在 .ts 里，单测直接渲染断言文案、按钮与回调。
 */
import { createElement, type ReactElement } from "react"
import type { KeyHint } from "./key-hint.ts"

export function renderKeyHint(
  hint: KeyHint | undefined,
  providerName: string,
  t: (key: string, vars?: Record<string, string>) => string,
  actions: { onEdit: () => void; onOpenUrl: (url: string) => void },
  testIdPrefix = "key-hint"
): ReactElement | null {
  if (!hint) return null
  const text =
    hint.kind === "forbidden"
      ? t("settings.providers.keyForbiddenHint")
      : t("settings.providers.keyBillingHint", { name: providerName })
  const billingUrl = hint.kind === "billing" ? hint.url : undefined
  const button =
    hint.kind === "forbidden"
      ? { label: t("settings.providers.fixKey"), onClick: actions.onEdit }
      : billingUrl
        ? { label: t("settings.providers.topUp"), onClick: () => actions.onOpenUrl(billingUrl) }
        : undefined
  return createElement(
    "span",
    {
      "data-testid": testIdPrefix,
      "data-hint-kind": hint.kind,
      className: "inline-flex flex-wrap items-center gap-1.5 text-caption-2-medium text-text-secondary"
    },
    createElement("span", null, text),
    button
      ? createElement(
          "button",
          {
            type: "button",
            "data-testid": `${testIdPrefix}-action`,
            onClick: (event: { stopPropagation: () => void }) => {
              event.stopPropagation()
              button.onClick()
            },
            className: "cursor-pointer text-accent-600 hover:underline"
          },
          button.label
        )
      : null
  )
}
