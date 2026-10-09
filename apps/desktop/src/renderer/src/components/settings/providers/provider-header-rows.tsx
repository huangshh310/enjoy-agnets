/**
 * 请求头键值行。落盘仍是 JSON。空值保留 vault 里的旧值，删行才去掉该头。
 */
import { RiAddLine, RiCloseLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useT } from "@renderer/i18n"

type HeaderRow = { key: string; value: string }

export function ProviderHeaderRows({
  value,
  hints,
  onChange
}: {
  value?: string
  hints?: string[]
  onChange: (json: string) => void
}) {
  const t = useT()
  const rows = parseRows(value)
  const write = (next: HeaderRow[]) => onChange(JSON.stringify(rowsToMap(next)))

  return (
    <div className="flex flex-col gap-2 p-2.5">
      {hints && hints.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {hints.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => {
                if (rows.some((row) => row.key === hint)) return
                write([...rows, { key: hint, value: "" }])
              }}
              className="rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 text-caption-2-medium text-accent-600"
            >
              {hint}
            </button>
          ))}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="px-0.5 text-caption-1-medium text-text-tertiary">{t("settings.providers.noHeaders")}</p>
      ) : null}
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`} className="flex items-center gap-2">
          <Input
            value={row.key}
            aria-label={t("settings.providers.headerKey")}
            placeholder={t("settings.providers.headerKey")}
            onChange={(event) => write(rows.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))}
            className="h-8 font-mono text-caption-1-regular"
          />
          <Input
            value={row.value}
            aria-label={t("settings.providers.headerValue")}
            placeholder={t("settings.providers.headerKeep")}
            onChange={(event) => write(rows.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}
            className="h-8 font-mono text-caption-1-regular"
          />
          <button
            type="button"
            aria-label={t("settings.providers.removeModel")}
            onClick={() => write(rows.filter((_, i) => i !== index))}
            className="inline-flex size-8 items-center justify-center text-text-tertiary hover:text-text-error-primary"
          >
            <RiCloseLine className="size-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start rounded-xl" onClick={() => write([...rows, { key: "", value: "" }])}>
        <RiAddLine className="mr-1 size-3.5" />
        {t("settings.providers.addHeader")}
      </Button>
    </div>
  )
}

function parseRows(raw?: string): HeaderRow[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return []
    return Object.entries(parsed)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, value]) => ({ key, value }))
  } catch {
    return []
  }
}

function rowsToMap(rows: HeaderRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key) out[key] = row.value
  }
  return out
}
