/**
 * Registry 左侧列表：名称、来源、状态，无营销 Hero。
 */
import type { RegistryRow, RegistryStatus } from "./acp-registry.types"
import { useT } from "@renderer/i18n"

export function AcpRegistryList({
  rows,
  selectedId,
  onSelect
}: {
  rows: RegistryRow[]
  selectedId: string | undefined
  onSelect: (id: string) => void
}) {
  const t = useT()
  return (
    <ul className="flex flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-1.5">
      {rows.map((row) => {
        const on = row.tool.id === selectedId
        return (
          <li key={row.tool.id}>
            <button
              type="button"
              onClick={() => onSelect(row.tool.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left ${
                on
                  ? "bg-background-secondary-default font-semibold text-text-primary ring-1 ring-border-button-default"
                  : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-caption-1-medium">{row.tool.label}</span>
                <span className="block truncate text-caption-2-medium text-text-tertiary">
                  {t("settings.registry.sourceOfficial")}
                </span>
              </span>
              <StatusChip status={row.status} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function StatusChip({ status }: { status: RegistryStatus }) {
  const t = useT()
  const label =
    status === "ready"
      ? t("settings.agentTools.statusReady")
      : status === "comingSoon"
        ? t("settings.agentTools.statusSoon")
        : t("settings.agentTools.statusMissing")
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 text-caption-2-medium ${
        status === "ready"
          ? "bg-accent-500/10 text-accent-600"
          : "bg-background-secondary-default text-text-tertiary"
      }`}
    >
      {label}
    </span>
  )
}
