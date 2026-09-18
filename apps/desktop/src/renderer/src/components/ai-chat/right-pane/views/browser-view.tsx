/**
 * 右栏浏览器：地址栏 + webview。设计模式把 DOM 摘要送进对话。
 */
import { createElement, useEffect, useRef, useState, type FormEvent } from "react"
import {
  RiFocus3Line,
  RiGlobalLine,
  RiRefreshLine,
  RiTerminalBoxLine,
  RiWifiOffLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { parseHttpUrl } from "@renderer/lib/http-url"
import { addQuotedContext } from "@renderer/hooks/quoted-context"
import { steerPreparedText } from "@renderer/hooks/runtime-interact/steer-composer"
import { PANE_FOCUS } from "../constants"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { collectSessionPreviewUrl } from "../../composer/session-review/preview-open/pick-preview-target"
import { revealRightPane } from "../open-pane"
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
  const messages = useChatStore((state) => state.messages)
  const sessionUrl = collectSessionPreviewUrl(messages)
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const [draft, setDraft] = useState(url ?? "")
  const [src, setSrc] = useState(() => parseHttpUrl(url) ?? "")
  const [picking, setPicking] = useState(false)
  const [loadError, setLoadError] = useState<{ code: number; description: string } | null>(null)

  useEffect(() => {
    const href = parseHttpUrl(url)
    if (!href) return
    setDraft(href)
    setSrc(href)
    setLoadError(null)
  }, [url])

  useEffect(() => {
    const view = webviewRef.current
    if (!view) return

    const onFail = (e: Event) => {
      const fe = e as { errorCode?: number; errorDescription?: string }
      if (fe.errorCode !== -3) {
        setLoadError({
          code: fe.errorCode ?? -102,
          description: fe.errorDescription ?? "ERR_CONNECTION_REFUSED"
        })
      }
    }

    const onSuccess = () => {
      setLoadError(null)
    }

    view.addEventListener("did-fail-load", onFail)
    view.addEventListener("did-finish-load", onSuccess)
    return () => {
      view.removeEventListener("did-fail-load", onFail)
      view.removeEventListener("did-finish-load", onSuccess)
    }
  }, [src])

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
        loadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center animate-in fade-in-50 duration-200">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <RiWifiOffLine className="size-6" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-body-semibold text-text-primary">本地服务未启动</h3>
              <p className="mt-1 text-caption-1-regular text-text-tertiary">
                无法连接到 <span className="font-mono text-text-secondary">{src}</span>（连接被拒绝）。本地开发服务尚未启动或端口已关闭。
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoadError(null)
                  webviewRef.current?.reload()
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-caption-2-medium text-text-primary hover:bg-background-secondary-hover transition-colors"
              >
                <RiRefreshLine className="size-3.5" />
                <span>刷新重试</span>
              </button>
              <button
                type="button"
                onClick={() => revealRightPane("terminal")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-1.5 text-caption-2-medium font-medium text-accent-500 hover:bg-accent-500/20 transition-colors"
              >
                <RiTerminalBoxLine className="size-3.5" />
                <span>打开终端启动服务</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {createElement("webview", {
              src,
              partition: "persist:enjoy-preview",
              webpreferences: "contextIsolation=yes, nodeIntegration=no",
              ref: webviewRef,
              style: { width: "100%", height: "100%" }
            })}
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <RiGlobalLine className="size-10 text-foreground-icon-secondary" aria-hidden />
          <p className="text-body-medium text-text-primary">{t("chat.paneBrowser")}</p>
          <p className="text-caption-1-medium text-text-tertiary">{t("chat.browserEmpty")}</p>
          {sessionUrl ? (
            <button
              type="button"
              onClick={() => {
                setDraft(sessionUrl)
                setSrc(sessionUrl)
              }}
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/80 px-3 py-1 text-caption-1-medium text-accent-600 transition-colors hover:border-accent-500 dark:text-accent-400 shadow-2xs"
            >
              <RiGlobalLine className="size-3.5" />
              <span>载入 {sessionUrl}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
