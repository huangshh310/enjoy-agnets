/**
 * 右栏浏览器：地址栏 + webview。设计模式把 DOM 摘要送进对话。
 */
import { createElement, useEffect, useRef, useState, type FormEvent } from "react"
import { RiFocus3Line, RiGlobalLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { parseHttpUrl } from "@renderer/lib/http-url"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { steerPreparedText } from "@renderer/hooks/runtime-interact/steer-composer"
import { PANE_FOCUS } from "../constants"
import { useT } from "@renderer/i18n"
import { importDesignScreenshot } from "./browser-design-capture"
import { BROWSER_DESIGN_SCRIPT } from "./browser-design-script"

type DesignPick = {
  tag?: string
  html?: string
  text?: string
  css?: string
}

export function BrowserView({ url }: { url?: string }) {
  const t = useT()
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const [draft, setDraft] = useState(url ?? "")
  const [src, setSrc] = useState(() => parseHttpUrl(url) ?? "")
  const [picking, setPicking] = useState(false)

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

  async function startDesignMode() {
    const view = webviewRef.current
    if (!view || picking) return
    setPicking(true)
    try {
      const picked = (await view.executeJavaScript(BROWSER_DESIGN_SCRIPT, true)) as DesignPick
      const html = picked?.html?.trim() ?? ""
      if (!html) return
      const title = `${picked.tag ?? "element"} from ${src}`
      addQuotedContext({
        id: `design-${Date.now()}`,
        type: "file",
        title,
        content: [html, picked.css, picked.text].filter(Boolean).join("\n\n"),
        snippet: html.slice(0, 280)
      })
      await importDesignScreenshot(view, picked.tag ?? "element").catch(() => undefined)
      void steerPreparedText(`Design mode picked <${picked.tag ?? "element"}>. Use the quoted HTML/CSS and screenshot.`)
    } finally {
      setPicking(false)
    }
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
        <button
          type="button"
          disabled={!src || picking}
          onClick={() => void startDesignMode()}
          title={t("chat.designModeHint")}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-caption-2-medium text-text-secondary hover:text-text-primary disabled:opacity-40"
        >
          <RiFocus3Line className="size-4" />
          <span className="sr-only">{t("chat.designMode")}</span>
        </button>
      </form>
      {src ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {createElement("webview", {
            src,
            partition: "persist:enjoy-preview",
            ref: webviewRef,
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
