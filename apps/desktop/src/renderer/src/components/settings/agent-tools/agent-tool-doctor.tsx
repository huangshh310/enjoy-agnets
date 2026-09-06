/**
 * 单项 doctor：跑 --version / acp --check，展示原文。
 */
import { useState } from "react"
import type { AgentToolDoctorResult, AgentToolId } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function AgentToolDoctor({ id }: { id: AgentToolId }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AgentToolDoctorResult | null>(null)

  async function run() {
    if (!hasIde()) return
    setBusy(true)
    try {
      setResult((await getIde().agentTools.doctor({ id })) as AgentToolDoctorResult)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-[12rem] flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run()}>
        {busy ? t("settings.agentTools.checking") : t("settings.agentTools.doctor")}
      </Button>
      {result ? (
        <p
          className={`max-w-xs text-right font-mono text-caption-2-medium ${
            result.ok ? "text-text-secondary" : "text-text-error-primary"
          }`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  )
}
