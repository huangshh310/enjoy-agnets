/**
 * 设置页供应商行的密钥三态文字。用 createElement 写在 .ts 里，行组件直接调用，单测能渲染断言
 * data-key-status / data-tone / 颜色类，回退到「有密钥就 ok」或「写死绿」会红。
 * 无需密钥 / 没填密钥返回 null，行里走原来的文案。
 */
import { createElement, type ReactElement } from "react"
import { presetDisplayName, providerKeyView } from "../../../lib/credential/key-status.ts"
import { keyHintOf } from "../../../lib/credential/key-hint.ts"
import { renderKeyHint } from "../../../lib/credential/key-hint-view.ts"

export type ProviderKeyStatusProfile = Parameters<typeof providerKeyView>[0] & { kind: string; name: string }

export function renderProviderKeyStatus(
  profile: ProviderKeyStatusProfile,
  t: (key: string, vars?: Record<string, string>) => string,
  onEdit: () => void
): ReactElement | null {
  const view = providerKeyView(profile)
  if (!view) return null
  const name = presetDisplayName(profile.kind, profile.name)
  return createElement(
    "span",
    {
      "data-testid": "provider-key-status",
      "data-key-status": view.status,
      "data-tone": view.tone,
      className: `inline-flex items-center gap-1.5 ${view.showFix ? "font-medium " : ""}${view.textClass}`
    },
    createElement("span", { "aria-hidden": true, className: `size-1.5 rounded-full ${view.dotClass}` }),
    t(view.labelKey, { name }),
    view.showFix
      ? createElement(
          "button",
          {
            type: "button",
            "data-testid": "provider-fix-key",
            onClick: onEdit,
            className: "cursor-pointer text-accent-600 hover:underline"
          },
          t("settings.providers.fixKey")
        )
      : null
  )
}

/** 设置页供应商行：密钥「暂时没法确认」且原始码是 forbidden / billing 时的提示条；其余返回 null。 */
export function renderProviderKeyHint(
  profile: ProviderKeyStatusProfile & { credentialCheck?: Parameters<typeof keyHintOf>[0] },
  t: (key: string, vars?: Record<string, string>) => string,
  actions: { onEdit: () => void; onOpenUrl: (url: string) => void }
): ReactElement | null {
  if (!providerKeyView(profile)) return null
  return renderKeyHint(
    keyHintOf(profile.credentialCheck, profile.kind),
    presetDisplayName(profile.kind, profile.name),
    t,
    actions,
    "provider-key-hint"
  )
}
