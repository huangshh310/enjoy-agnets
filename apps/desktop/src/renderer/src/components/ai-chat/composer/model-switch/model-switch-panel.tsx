/**
 * 本引擎模型表。不含导轨、不含第二引擎、不含协议微标。
 */
import { cx } from "@/utils/cx"
import { CliModelMark } from "@renderer/components/ai-chat/agent-picker/cli-model-mark"
import { useT } from "@renderer/i18n"
import type { ModelSwitchKind } from "@renderer/lib/model-switch-state"

export type SwitchableModel = { id: string; label: string }

export function ModelSwitchPanel({
  kind,
  runtimeId,
  engineLabel,
  models,
  currentId,
  onPick,
  onRetry
}: {
  kind: ModelSwitchKind
  runtimeId: string
  engineLabel: string
  models: SwitchableModel[]
  currentId: string
  onPick: (model: SwitchableModel) => void
  onRetry: () => void
}) {
  const t = useT()
  if (kind === "needs_login" || kind === "empty") {
    return <ModelSwitchFailure kind={kind} onRetry={onRetry} />
  }
  return (
    <div className="flex max-h-[22rem] w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden">
      <header className="border-b border-separator-border px-3 py-2.5">
        <p className="text-body-2-semibold text-text-primary">{t("chat.modelSwitch.menuTitle")}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">
          {t("chat.modelSwitch.menuSubtitle", { engine: engineLabel })}
        </p>
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-separator-border overflow-y-auto">
        {models.map((model) => {
          const current = model.id === currentId
          return (
            <li key={model.id}>
              <button
                type="button"
                data-testid={`model-switch-item-${model.id}`}
                onClick={() => onPick(model)}
                className={cx(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-caption-1-regular transition-colors",
                  current
                    ? "bg-accent-500/10 text-text-primary"
                    : "text-text-primary hover:bg-background-secondary-hover"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <CliModelMark agentId={runtimeId} model={model} />
                  </span>
                  <span className={current ? "min-w-0 truncate font-medium" : "min-w-0 truncate"}>
                    {model.label}
                  </span>
                </span>
                {current ? (
                  <span className="text-caption-2-medium text-accent-500">{t("chat.modelSwitch.current")}</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-separator-border bg-background-secondary-default px-3 py-2 text-caption-2-regular text-text-tertiary">
        {t("chat.modelSwitch.menuFootnote")}
      </p>
    </div>
  )
}

function ModelSwitchFailure({
  kind,
  onRetry
}: {
  kind: "needs_login" | "empty"
  onRetry: () => void
}) {
  const t = useT()
  return (
    <div className="w-[min(18rem,calc(100vw-2rem))] px-3 py-3" data-testid={`model-switch-fail-${kind}`}>
      <div className="flex items-start gap-2">
        <span className="mt-1 size-2 shrink-0 rounded-full bg-text-warning-primary" />
        <div>
          <p className="text-caption-1-medium text-text-primary">
            {kind === "needs_login" ? t("chat.modelSwitch.notLoggedIn") : t("chat.modelSwitch.empty")}
          </p>
          {kind === "empty" ? (
            <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t("chat.modelSwitch.emptyHint")}</p>
          ) : null}
          <button
            type="button"
            onClick={onRetry}
            className={cx(
              "mt-1.5 h-7 rounded-lg px-2.5 text-caption-1-medium",
              kind === "needs_login"
                ? "bg-accent-500 text-text-white hover:bg-accent-600"
                : "border border-border-button-default text-text-primary hover:bg-background-secondary-hover"
            )}
          >
            {t("chat.modelSwitch.retry")}
          </button>
        </div>
      </div>
    </div>
  )
}
