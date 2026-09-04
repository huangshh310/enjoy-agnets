/**
 * 发票列表：本机下载 CSV，不假装远端导出成功。
 */
import { RiCheckLine, RiDownload2Line, RiExternalLinkLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { downloadTextFile, invoiceToCsvRow, invoicesToCsv } from "../lib/billing-export"
import type { BillingInvoice } from "../billing.types"

interface BillingInvoicesCardProps {
  invoices: BillingInvoice[]
}

export function BillingInvoicesCard({ invoices }: BillingInvoicesCardProps) {
  function handleExport() {
    downloadTextFile("invoices.csv", invoicesToCsv(invoices), "text/csv;charset=utf-8")
  }

  function handleOpen(invoice: BillingInvoice) {
    downloadTextFile(`${invoice.id}.csv`, invoiceToCsvRow(invoice), "text/csv;charset=utf-8")
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-card">
      <header className="flex items-center justify-between p-5">
        <h2 className="text-title-3-semibold text-text-primary">Invoices</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExport}
          className="gap-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          <RiDownload2Line className="size-3.5" />
          <span>Export all</span>
        </Button>
      </header>

      <Separator className="bg-separator-border/60" />

      <ul className="divide-y divide-separator-border/40">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex items-center gap-4 px-5 py-3.5 text-caption-1-medium transition-colors hover:bg-background-secondary-hover/40"
          >
            <span className="min-w-[7rem] font-mono text-caption-2-medium text-text-tertiary">
              {invoice.id}
            </span>
            <span className="flex-1 font-mono text-caption-1-medium text-text-tertiary">
              {invoice.date}
            </span>
            <span className="font-mono text-body-medium text-text-primary">{invoice.amount}</span>
            <span className="inline-flex items-center gap-1 rounded border border-state-success-text/25 bg-state-success-text/10 px-2 py-0.5 font-mono text-caption-2-medium uppercase text-state-success-text">
              <RiCheckLine className="size-2.5" />
              <span>{invoice.statusLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => handleOpen(invoice)}
              className="ml-2 inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-foreground-icon-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
              title={`下载 ${invoice.id}`}
              aria-label={`Download ${invoice.id}`}
            >
              <RiExternalLinkLine className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
