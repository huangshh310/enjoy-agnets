import { useState } from "react"
import { RiKey2Line } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { AgentToolAddArchiveLink } from "./agent-tool-add-archive-link"
import { BindField } from "./bind-source/bind-field"
import { AgentToolBoundExtras } from "./agent-tool-provider-bind"
import { AgentToolSourceMenu } from "./agent-tool-source-menu"
import { AgentToolQuickKeyDialog } from "./agent-tool-quick-key-dialog"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolProvider({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const [quickKeyOpen, setQuickKeyOpen] = useState(false)
  const profiles = actions.compatibleProviders
  const bound = actions.allProviders.find((item) => item.id === tool.providerId)
  const usingProvider = Boolean(tool.useCustomProvider && bound)

  if (!actions.supportsCustomInjection) return null

  return (
    <section className="flex flex-col gap-3">
      <header>
        <h4 className="text-headline-medium text-text-primary">{t("settings.agentTools.providerMode")}</h4>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("settings.agentTools.providerModeHint")}
        </p>
      </header>
      <BindField label={t("settings.agentTools.bindAccountLabel")}>
        <AgentToolSourceMenu
          tool={tool}
          profiles={profiles}
          bound={bound}
          usingProvider={usingProvider}
          persist={actions.persist}
        />
        <div className="flex flex-col gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setQuickKeyOpen(true)}
            className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-lg bg-accent-500/10 px-2.5 py-1 text-caption-2-medium text-accent-600 transition-colors hover:bg-accent-500/20 hover:text-accent-500"
          >
            <RiKey2Line className="size-3.5" />
            <span>{t("settings.agentTools.quickConfigKeyAction")}</span>
          </button>
          <AgentToolAddArchiveLink empty={profiles.length === 0} />
        </div>
      </BindField>
      {usingProvider && bound ? (
        <AgentToolBoundExtras tool={tool} actions={actions} profile={bound} />
      ) : null}

      <AgentToolQuickKeyDialog
        open={quickKeyOpen}
        onOpenChange={setQuickKeyOpen}
        tool={tool}
        onSaved={async (providerId, modelId) => {
          await actions.persist({
            useCustomProvider: true,
            providerId,
            modelId
          })
        }}
      />
    </section>
  )
}
