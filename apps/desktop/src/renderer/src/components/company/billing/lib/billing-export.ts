/**
 * 发票清单导出：生成真实 CSV 文本，由 UI 触发本机下载。
 */
import type { BillingInvoice } from "../billing.types"

export function invoicesToCsv(invoices: BillingInvoice[]): string {
  const header = "id,date,amount,status"
  const rows = invoices.map((invoice) =>
    [invoice.id, invoice.date, invoice.amount, invoice.status].join(",")
  )
  return [header, ...rows].join("\n")
}

export function invoiceToCsvRow(invoice: BillingInvoice): string {
  return invoicesToCsv([invoice])
}

/** 浏览器本机下载文本，不假装远端成功。 */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
