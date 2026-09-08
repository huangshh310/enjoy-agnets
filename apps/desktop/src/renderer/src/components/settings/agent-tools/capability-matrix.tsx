/**
 * 设置 → 智能体：静态 RuntimeCapabilities 只读矩阵。
 */
import {
  MATRIX_RUNTIME_IDS,
  capabilitiesFor,
  runtimePathKind,
  SANDBOX_HARNESS_ID,
  type RuntimeCapabilities
} from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"

const COLS = ["spawn", "login", "quota", "thinking", "fast", "executionModes"] as const

export function CapabilityMatrix() {
  const t = useT()
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-body-medium font-semibold text-text-primary">{t("settings.runtimeCaps.title")}</h3>
        <p className="mt-0.5 text-caption-1-regular text-text-secondary">{t("settings.runtimeCaps.desc")}</p>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-border-button-default">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-separator-border bg-background-secondary-default/60">
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.runtimeCaps.colRuntime")}</th>
              <th className="px-3 py-2 text-caption-2-medium text-text-tertiary">{t("settings.runtimeCaps.colPath")}</th>
              {COLS.map((col) => (
                <th key={col} className="px-3 py-2 text-caption-2-medium text-text-tertiary">
                  {t(`settings.runtimeCaps.col.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_RUNTIME_IDS.map((id) => (
              <MatrixRow key={id} id={id} cap={capabilitiesFor(id)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MatrixRow({ id, cap }: { id: string; cap: RuntimeCapabilities }) {
  const t = useT()
  const path = runtimePathKind(id)
  const label =
    id === SANDBOX_HARNESS_ID ? t("settings.runtimeCaps.sandboxLabel") : runtimeLabel(id)
  return (
    <tr className="border-b border-separator-border/70 last:border-0">
      <td className="px-3 py-2 text-caption-1-medium text-text-primary">{label}</td>
      <td className="px-3 py-2 text-caption-2-medium text-text-secondary">{t(`settings.runtimeCaps.path.${path}`)}</td>
      <td className="px-3 py-2">{flag(cap.spawn, t)}</td>
      <td className="px-3 py-2">{flag(cap.login, t)}</td>
      <td className="px-3 py-2">{flag(cap.quota, t)}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.thinking}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.fast}</td>
      <td className="px-3 py-2 font-mono text-caption-2-medium text-text-secondary">{cap.executionModes}</td>
    </tr>
  )
}

function runtimeLabel(id: string): string {
  const names: Record<string, string> = {
    "enjoy-local": "Enjoy 本地",
    claude: "Claude Code",
    cursor: "Cursor CLI",
    grok: "Grok Build",
    codex: "Codex CLI",
    antigravity: "Antigravity",
    gemini: "Gemini CLI",
    opencode: "OpenCode",
    pi: "Pi",
    hermes: "Hermes",
    amp: "Amp",
    deepseek: "DeepSeek",
    omp: "Oh My Pi"
  }
  return names[id] ?? id
}

function flag(on: boolean, t: TranslateFn) {
  return (
    <span className={on ? "text-caption-2-medium text-accent-600" : "text-caption-2-medium text-text-tertiary"}>
      {on ? t("settings.runtimeCaps.yes") : t("settings.runtimeCaps.no")}
    </span>
  )
}
