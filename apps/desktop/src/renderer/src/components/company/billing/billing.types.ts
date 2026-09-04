/**
 * 企业中心账单领域模型契约定义：
 * 对齐 https://www.devl.dev/c/settings/billing 设计规约。
 */

export interface BillingPlanInfo {
  /** 套餐名称，例如 "Team Enterprise", "Pro" */
  name: string
  /** 周期标识标签，例如 "Annual", "按年计费" */
  tierBadge: string
  /** 权益摘要描述 */
  description: string
  /** 状态："active" | "canceled" | "past_due" */
  status: "active" | "canceled" | "past_due"
  /** 状态与续费标签 */
  statusLabel: string
  /** 月度折算单价 (USD) */
  priceMonthly: number
  /** 币种标识，如 "USD" */
  currency: string
  /** 席位占用数 */
  seatsUsed: number
  /** 席位总配额 */
  seatsTotal: number
}

export interface PaymentMethodInfo {
  /** 发卡组织/支付机构，例如 "Visa", "MasterCard" */
  brand: string
  /** 卡号尾号 4 位 */
  last4: string
  /** 有效期，例如 "08/29" */
  expiry: string
  /** 账单联络邮箱 */
  billingEmail: string
  /** 是否为默认扣缴账户 */
  isDefault: boolean
}

export interface BillingStatItem {
  id: string
  label: string
  value: string
  /** 指标补充说明 */
  caption: string
  icon: "credits" | "tax" | "currency"
}

export interface BillingInvoice {
  id: string
  date: string
  amount: string
  status: "paid" | "pending" | "refunded"
  statusLabel: string
  pdfUrl?: string
}

/** 方案全景横向特性对比矩阵 */
export interface ComparisonPlanColumn {
  id: string
  name: string
  price: string
  cadence: string
  highlight?: boolean
}

export interface ComparisonRow {
  label: string
  values: Array<string | boolean>
}

export interface ComparisonSection {
  title: string
  rows: ComparisonRow[]
}

/** 升级与选配多阶套餐方案定义 */
export interface UpgradeTierPlan {
  id: string
  name: string
  monthlyPricePerSeat: number
  yearlyPricePerSeat: number
  blurb: string
  badge?: string
  features: string[]
  primary?: boolean
  defaultSeats?: number
}
