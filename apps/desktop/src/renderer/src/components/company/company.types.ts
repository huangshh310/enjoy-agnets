/**
 * 企业中心数据类型：账单、组织详情与外部集成。
 */
export interface BillingPlanInfo {
  name: string
  priceMonthly: number
  interval: "month" | "year"
  seatsUsed: number
  seatsTotal: number
  renewsAt: string
  status: "active" | "past_due" | "canceled"
}

export interface CompanyDetailsData {
  legalName: string
  domain: string
  organizationId: string
  complianceTier: string
  dataResidency: "local" | "hybrid"
  zeroDataRetention: boolean
  securityContact: string
}

export interface CompanyIntegrationItem {
  id: string
  name: string
  description: string
  category: "vcs" | "collaboration" | "monitoring"
  connected: boolean
  account?: string
  lastSyncAt?: string
}
