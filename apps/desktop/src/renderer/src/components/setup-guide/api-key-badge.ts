/**
 * 第 4 步 API 密钥行右侧徽标。用 createElement 写在 .ts 里，组件直接调用，单测能渲染断言
 * data-key-status / data-tone / 颜色类，回退到「写死绿」会红。
 */
import { createElement, type ReactElement } from "react"
import { apiKeyBadgeView, type ConnectModelOption } from "./connect-model-options.ts"

export function renderApiKeyBadge(
  option: ConnectModelOption,
  t: (key: string, vars?: Record<string, string>) => string
): ReactElement | null {
  const view = apiKeyBadgeView(option)
  if (!view) return null
  return createElement(
    "span",
    {
      "data-testid": "connect-model-key-badge",
      "data-key-status": view.status,
      "data-tone": view.tone,
      className: `inline-flex shrink-0 items-center gap-1.5 text-caption-1-medium ${view.textClass}`
    },
    createElement("span", { "aria-hidden": true, className: `size-1.5 rounded-full ${view.dotClass}` }),
    createElement(
      "span",
      view.showFix
        ? { "data-testid": "connect-model-fix-key", className: "underline-offset-2 hover:underline" }
        : {},
      t(view.labelKey)
    )
  )
}
