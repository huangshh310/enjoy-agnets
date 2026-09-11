/**
 * 订阅图颜色：chart token，禁止手写 hex。
 */
export const SPEND_SLICE_VARS = [
  "var(--color-chart-3)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-5)",
  "var(--color-chart-4)",
  "var(--color-chart-1)",
  "var(--color-chart-8)",
  "var(--color-chart-2)"
] as const

const SLICE_BY_ID: Record<string, string> = {
  claude: "var(--color-chart-3)",
  cursor: "var(--color-foreground-icon-primary)",
  codex: "var(--color-chart-7)",
  grok: "var(--color-chart-5)",
  antigravity: "var(--color-chart-4)",
  omp: "var(--color-chart-1)"
}

export function spendSliceFill(id: string, index = 0): string {
  return SLICE_BY_ID[id] ?? SPEND_SLICE_VARS[index % SPEND_SLICE_VARS.length]
}

export interface SpendSlice {
  id: string
  label: string
  amount: number
  displayAmount: string
}
