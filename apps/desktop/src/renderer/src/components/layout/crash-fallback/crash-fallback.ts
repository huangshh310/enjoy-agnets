/**
 * 渲染崩溃回退面：短句 + 重新加载。堆栈只在开发者档。
 */
import { createElement, type ReactElement } from "react"
import { isDevCopyEnabled } from "../../../lib/dev-copy.ts"
import { crashFallbackCopy, userFacingCrashDetail } from "./crash-fallback-copy.ts"

export function CrashFallback({
  error,
  onReload,
  isDev = isDevCopyEnabled(),
  locale = "zh"
}: {
  error?: unknown
  onReload: () => void
  isDev?: boolean
  locale?: "zh" | "en"
}): ReactElement {
  const copy = crashFallbackCopy(locale)
  const detail = userFacingCrashDetail(error, isDev)
  return createElement(
    "div",
    {
      "data-testid": "renderer-crash-fallback",
      className:
        "flex h-full min-h-[100dvh] items-center justify-center bg-background-full p-6"
    },
    createElement(
      "div",
      {
        className:
          "flex max-w-sm flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
      },
      createElement("p", { className: "text-headline-semibold text-text-primary" }, copy.title),
      detail
        ? createElement(
            "pre",
            {
              "data-testid": "renderer-crash-stack",
              className:
                "max-h-40 overflow-auto whitespace-pre-wrap text-caption-2-regular text-text-tertiary"
            },
            detail
          )
        : null,
      createElement(
        "button",
        {
          type: "button",
          "data-testid": "renderer-crash-reload",
          onClick: onReload,
          className:
            "inline-flex h-9 cursor-pointer items-center justify-center rounded-2lg bg-button-primary px-3 text-body-medium text-text-white outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        },
        copy.reload
      )
    )
  )
}
