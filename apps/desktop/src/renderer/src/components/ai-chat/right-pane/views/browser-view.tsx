/**
 * 右栏浏览器：地址栏 + Electron webview 预览 http(s)。
 */
import { createElement, useEffect, useState, type FormEvent } from "react"
import { RiGlobalLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { parseHttpUrl } from "@renderer/lib/http-url"
import { PANE_FOCUS } from "../constants"
import { useT } from "@renderer/i18n"

export function BrowserView({ url }: { url?: string }) {
  const t = useT()
  const [draft, setDraft] = useState(url ?? "")
  const [src, setSrc] = useState(() => parseHttpUrl(url) ?? "")

  useEffect(() => {
    const href = parseHttpUrl(url)
    if (!href) return
    setDraft(href)
    setSrc(href)
  }, [url])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const href = parseHttpUrl(draft)
    if (!href) return
    setDraft(href)
    setSrc(href)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        onSubmit={onSubmit}
        className="flex h-9 shrink-0 items-center gap-2 border-b border-separator-border px-2"
      >
        <RiGlobalLine className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={t("chat.browserAddress")}
          placeholder={t("chat.browserAddress")}
          className={cx(
            "min-w-0 flex-1 border-0 bg-transparent font-mono text-caption-1-medium text-text-primary",
            PANE_FOCUS
          )}
        />
      </form>
      {src ? (
        <div key={src} className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {createElement("webview", {
            src,
            partition: "persist:enjoy-preview",
            style: { width: "100%", height: "100%" }
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <RiGlobalLine className="size-10 text-foreground-icon-secondary" aria-hidden />
          <p className="text-body-medium text-text-primary">{t("chat.paneBrowser")}</p>
          <p className="text-caption-1-medium text-text-tertiary">{t("chat.browserEmpty")}</p>
        </div>
      )}
    </div>
  )
}
