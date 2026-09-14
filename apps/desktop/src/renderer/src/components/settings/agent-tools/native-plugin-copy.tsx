/**
 * 原生插件诚实复制命令：Enjoy 不代跑 Cordis / Claude hooks。
 */
import { useState } from "react"
import { RiFileCopyLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function NativePluginCopy({ tool }: { tool: AgentToolPublic }) {
  const t = useT()
  const command = tool.nativePluginCopy?.trim()
  const [copied, setCopied] = useState(false)
  if (!command) return null

  function copy() {
    void navigator.clipboard.writeText(command!).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <section className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3">
      <p className="text-caption-1-medium text-text-primary">{t("settings.agentTools.nativePluginTitle")}</p>
      <p className="mt-1 text-caption-2-regular text-text-secondary">{t("settings.agentTools.nativePluginHint")}</p>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-background-primary-default px-2.5 py-2 font-mono text-[11px] text-text-secondary">
        {command}
      </pre>
      <Button type="button" size="sm" variant="outline" className="mt-2 gap-1.5" onClick={copy}>
        <RiFileCopyLine className="size-3.5 text-text-tertiary" />
        {copied ? t("settings.agentTools.copied") : t("settings.agentTools.copyCommand")}
      </Button>
    </section>
  )
}
