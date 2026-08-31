/**
 * 结构化增量：Extract 对象走卡片，带 fields 走表单，带 rows 走表。
 */
import { asExtractObject } from "@renderer/hooks/extract-object-shape"
import { ExtractObjectCard } from "./extract-object-card"

export function StructuredCard({
  value,
  variant = "card"
}: {
  value: unknown
  variant?: "card" | "form" | "table"
}) {
  if (variant === "form") return <FormView value={value} />
  if (variant === "table") return <TableView value={value} />
  const extracted = asExtractObject(value)
  if (extracted) return <ExtractObjectCard value={extracted} />
  return <pre className={cardClass}>{safeJson(value)}</pre>
}

function FormView({ value }: { value: unknown }) {
  const fields = readFields(value)
  if (fields.length === 0) return <pre className={cardClass}>{safeJson(value)}</pre>
  return (
    <dl className="rounded-2xl border border-separator-border bg-background-secondary-default/60 px-3 py-2">
      {fields.map((field) => (
        <div key={field.name} className="flex justify-between gap-3 py-1">
          <dt className="text-body-medium text-text-secondary">{field.name}</dt>
          <dd className="text-body-medium text-text-primary">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function TableView({ value }: { value: unknown }) {
  const rows = readRows(value)
  if (rows.length === 0) return <pre className={cardClass}>{safeJson(value)}</pre>
  const columns = Object.keys(rows[0] ?? {})
  return (
    <div className="overflow-x-auto rounded-2xl border border-separator-border">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-body-medium text-text-secondary">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-separator-border">
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-body-medium text-text-primary">
                  {String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const cardClass =
  "overflow-x-auto rounded-2xl border border-separator-border bg-background-secondary-default/60 p-3 text-body-medium text-text-secondary"

function readFields(value: unknown): Array<{ name: string; value: string }> {
  if (!value || typeof value !== "object") return []
  const rec = value as Record<string, unknown>
  const raw = Array.isArray(rec.fields) ? rec.fields : Object.entries(rec)
  return raw
    .map((item) => {
      if (Array.isArray(item)) return { name: String(item[0]), value: String(item[1] ?? "") }
      if (item && typeof item === "object" && "name" in item) {
        const field = item as { name: unknown; value?: unknown }
        return { name: String(field.name), value: String(field.value ?? "") }
      }
      return null
    })
    .filter((item): item is { name: string; value: string } => item != null)
}

function readRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === "object") as Array<
    Record<string, unknown>
  >
  if (value && typeof value === "object" && Array.isArray((value as { rows?: unknown }).rows)) {
    return ((value as { rows: unknown[] }).rows.filter((row) => row && typeof row === "object") ??
      []) as Array<Record<string, unknown>>
  }
  return []
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
