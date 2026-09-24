/**
 * CLI 左栏：已登录在前；未登录用实心「登录」钮，不靠灰字。
 */
import { useMemo, useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { NavRow, PendingRow } from "./cli-provider-nav-rows"
import {
  filterCliProviderRows,
  groupCliProviderNav,
  type CliProviderRow
} from "./cli-provider-rows"

export function CliProviderNav({
  rows,
  total,
  selectedKey,
  loginBusy,
  catalogPending,
  onSelect,
  onLogin
}: {
  rows: CliProviderRow[]
  total: number
  selectedKey: string
  loginBusy?: string | null
  catalogPending?: boolean
  onSelect: (key: string) => void
  onLogin?: (key: string) => void
}) {
  const t = useT()
  const [query, setQuery] = useState("")
  const visible = useMemo(() => filterCliProviderRows(rows, query), [query, rows])
  const { signed, customPending, pending } = groupCliProviderNav(visible)

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-separator-border bg-background-secondary-default/30">
      <div className="border-b border-separator-border px-2 py-1.5">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("chat.cliSearchProviders")}
          className="w-full bg-transparent text-caption-2-medium text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>
      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-1.5">
        <NavRow
          label={t("chat.allModels")}
          side={String(total)}
          selected={selectedKey === "all"}
          ready={total > 0}
          onClick={() => onSelect("all")}
        />
        {catalogPending && rows.length === 0 ? (
          <p className="px-2 py-2 text-caption-2-medium text-text-tertiary">{t("chat.cliProvidersLoading")}</p>
        ) : (
          <CliProviderNavGroups
            signed={signed}
            customPending={customPending}
            pending={pending}
            selectedKey={selectedKey}
            loginBusy={loginBusy}
            onSelect={onSelect}
            onLogin={onLogin}
          />
        )}
      </nav>
    </aside>
  )
}

/** 本机助手多家供应商：下拉选择，不再并排占出横向滚动。 */
export function CliProviderDrop(props: {
  rows: CliProviderRow[]
  selectedKey: string
  loginBusy?: string | null
  catalogPending?: boolean
  onSelect: (key: string) => void
  onLogin?: (key: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const current = props.rows.find((row) => row.key === props.selectedKey)
  const label = props.selectedKey === "all" || !current ? t("chat.allModels") : current.label
  return (
    <div className="relative shrink-0 border-b border-separator-border px-2 py-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("chat.activeProvider")}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "flex h-9 w-full items-center gap-2 rounded-lg border px-2 text-left shadow-2xs",
          open
            ? "border-accent-500 bg-accent-500/10"
            : "border-border-button-default bg-background-secondary-default hover:border-accent-500/50 hover:bg-accent-500/5"
        )}
      >
        <span className="shrink-0 rounded-md bg-accent-500/15 px-1.5 py-0.5 text-caption-2-medium text-accent-600">
          {t("chat.providersCount", { count: props.rows.length })}
        </span>
        <span className="min-w-0 flex-1 truncate text-caption-1-medium text-text-primary">{label}</span>
        <RiArrowDownSLine className={cx("size-4 shrink-0 text-text-secondary", open && "rotate-180")} aria-hidden />
      </button>
      {open ? <ProviderDropPanel {...props} onPick={(key) => { props.onSelect(key); setOpen(false) }} /> : null}
    </div>
  )
}

function ProviderDropPanel({
  rows,
  selectedKey,
  loginBusy,
  catalogPending,
  onPick,
  onLogin
}: {
  rows: CliProviderRow[]
  selectedKey: string
  loginBusy?: string | null
  catalogPending?: boolean
  onPick: (key: string) => void
  onLogin?: (key: string) => void
}) {
  const t = useT()
  const [query, setQuery] = useState("")
  const visible = useMemo(() => filterCliProviderRows(rows, query), [query, rows])
  const grouped = groupCliProviderNav(visible)
  return (
    <div className="no-scrollbar absolute inset-x-2 top-11 z-20 max-h-52 overflow-x-hidden overflow-y-auto rounded-lg border border-border-button-default bg-background-primary-default p-1 shadow-card">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("chat.cliSearchProviders")}
        className="mb-1 w-full bg-transparent px-2 py-1 text-caption-2-medium text-text-primary outline-none placeholder:text-text-tertiary"
      />
      {catalogPending && rows.length === 0 ? (
        <p className="px-2 py-2 text-caption-2-medium text-text-tertiary">{t("chat.cliProvidersLoading")}</p>
      ) : (
        <CliProviderNavGroups {...grouped} selectedKey={selectedKey} loginBusy={loginBusy} onSelect={onPick} onLogin={onLogin} />
      )}
    </div>
  )
}

function CliProviderNavGroups({
  signed,
  customPending,
  pending,
  selectedKey,
  loginBusy,
  onSelect,
  onLogin
}: {
  signed: CliProviderRow[]
  customPending: CliProviderRow[]
  pending: CliProviderRow[]
  selectedKey: string
  loginBusy?: string | null
  onSelect: (key: string) => void
  onLogin?: (key: string) => void
}) {
  const t = useT()
  return (
    <>
      {signed.length > 0 ? (
        <p className="px-2 pt-1.5 text-caption-2-medium text-text-tertiary">{t("chat.cliLoggedInProviders")}</p>
      ) : null}
      {signed.map((row) => (
        <NavRow
          key={row.key}
          label={row.label}
          side={String(row.count)}
          mark={row.origin === "custom" ? t("chat.cliCustomProvider") : undefined}
          selected={selectedKey === row.key}
          ready
          onClick={() => onSelect(row.key)}
        />
      ))}
      {customPending.length > 0 ? (
        <p className="px-2 pt-1.5 text-caption-2-medium text-text-tertiary">{t("chat.cliCustomProviders")}</p>
      ) : null}
      {customPending.map((row) => (
        <NavRow
          key={row.key}
          label={row.label}
          side={t("chat.cliCustomProvider")}
          selected={selectedKey === row.key}
          ready={false}
          onClick={() => onSelect(row.key)}
        />
      ))}
      {pending.length > 0 ? (
        <p className="px-2 pt-1.5 text-caption-2-medium text-text-tertiary">{t("chat.cliMoreProviders")}</p>
      ) : null}
      {pending.map((row) => (
        <PendingRow
          key={row.key}
          row={row}
          selected={selectedKey === row.key}
          busy={loginBusy === row.key}
          onSelect={() => onSelect(row.key)}
          onLogin={() => {
            onSelect(row.key)
            onLogin?.(row.key)
          }}
        />
      ))}
    </>
  )
}
