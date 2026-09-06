/**
 * 未被收录的启动项：可移除，高级用户才能再加。
 */
import { useState } from "react"
import { RiAddLine, RiCloseLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"
import type { AgentToolActions } from "../use-agent-tool-actions"
import { decodeLaunchArgs, encodeLaunchArgs, sanitizeCustomArgs } from "./args"

export function AgentToolCustomArgs({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const [draft, setDraft] = useState("")
  const decoded = decodeLaunchArgs(tool.id, tool.extraArgs ?? [])
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.customArgs")}</span>
      <p className="text-caption-2-regular text-text-tertiary">{t("settings.agentTools.customArgsHint")}</p>
      {decoded.custom.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {decoded.custom.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                void actions.persist({
                  extraArgs: encodeLaunchArgs(
                    tool.id,
                    decoded.values,
                    decoded.custom.filter((flag) => flag !== item)
                  )
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 font-mono text-caption-2-medium text-text-secondary hover:border-text-error-primary/40 hover:text-text-error-primary"
              title={t("settings.agentTools.customArgsRemove")}
            >
              {item}
              <RiCloseLine className="size-3" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="--flag"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            addCustom(tool, actions, decoded, draft, setDraft)
          }}
          className="font-mono text-caption-1-regular"
        />
        <Button type="button" size="sm" variant="outline" onClick={() => addCustom(tool, actions, decoded, draft, setDraft)}>
          <RiAddLine className="size-3.5" />
          {t("settings.agentTools.customArgsAdd")}
        </Button>
      </div>
    </div>
  )
}

function addCustom(
  tool: AgentToolPublic,
  actions: AgentToolActions,
  decoded: ReturnType<typeof decodeLaunchArgs>,
  draft: string,
  setDraft: (value: string) => void
) {
  const next = sanitizeCustomArgs(draft)
  if (!next.length) return
  void actions.persist({ extraArgs: encodeLaunchArgs(tool.id, decoded.values, [...decoded.custom, ...next]) })
  setDraft("")
}
