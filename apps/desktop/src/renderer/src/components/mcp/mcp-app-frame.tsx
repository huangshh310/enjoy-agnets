/**
 * MCP App 隔离 iframe：无 Node、受限 sandbox。postMessage 只交给 main 消毒。
 */
import { useEffect, useRef } from "react"
import { MCP_APP_CSP } from "@enjoy-agents/mcp/app-host"
import { useT } from "@renderer/i18n"

export function McpAppFrame(props: {
  srcDoc: string
  title?: string
  onAppMessage?: (raw: unknown) => void
}) {
  const t = useT()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const onAppMessage = props.onAppMessage

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return
      onAppMessage?.(event.data)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [onAppMessage])

  return (
    <iframe
      ref={frameRef}
      title={props.title ?? t("pages.mcp.appTitle")}
      data-testid="mcp-app-frame"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={props.srcDoc}
      className="h-72 w-full rounded-2xl border border-border-button-default bg-background-secondary-default"
      data-csp={MCP_APP_CSP}
    />
  )
}
