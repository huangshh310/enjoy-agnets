/**
 * 企业中心账单静态数据与默认配置：
 * 对齐 https://www.devl.dev/c/settings/billing 样本数据。
 */

import type {
  BillingInvoice,
  BillingPlanInfo,
  BillingStatItem,
  ComparisonPlanColumn,
  ComparisonSection,
  PaymentMethodInfo,
  UpgradeTierPlan
} from "./billing.types"

export const DEFAULT_BILLING_PLAN: BillingPlanInfo = {
  name: "Team Enterprise",
  tierBadge: "Annual",
  description: "25 席位 · 无限制智能体项目 · 50M API Token 吞吐",
  status: "active",
  statusLabel: "Active · renews May 14, 2027",
  priceMonthly: 199,
  currency: "USD",
  seatsUsed: 4,
  seatsTotal: 10
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethodInfo = {
  brand: "Visa",
  last4: "8848",
  expiry: "08/29",
  billingEmail: "billing@enjoy-agents.dev",
  isDefault: true
}

export const BILLING_EYEBROW_CLASS =
  "font-mono text-caption-2-medium uppercase text-text-tertiary"

export const DEFAULT_BILLING_STATS: BillingStatItem[] = [
  {
    id: "credits",
    label: "Credits",
    value: "$48.20",
    caption: "Auto-applied to next invoice",
    icon: "credits"
  },
  {
    id: "tax_id",
    label: "Tax ID",
    value: "专票 / 统一代码",
    caption: "91310000MA1FL2XXXX",
    icon: "tax"
  },
  {
    id: "currency",
    label: "Currency",
    value: "USD",
    caption: "Set per workspace",
    icon: "currency"
  }
]

export const DEFAULT_INVOICES: BillingInvoice[] = [
  {
    id: "INV-2026-04",
    date: "Apr 14, 2026",
    amount: "$199.00",
    status: "paid",
    statusLabel: "Paid"
  },
  {
    id: "INV-2026-03",
    date: "Mar 14, 2026",
    amount: "$199.00",
    status: "paid",
    statusLabel: "Paid"
  },
  {
    id: "INV-2026-02",
    date: "Feb 14, 2026",
    amount: "$199.00",
    status: "paid",
    statusLabel: "Paid"
  },
  {
    id: "INV-2026-01",
    date: "Jan 14, 2026",
    amount: "$199.00",
    status: "paid",
    statusLabel: "Paid"
  },
  {
    id: "INV-2025-12",
    date: "Dec 14, 2025",
    amount: "$199.00",
    status: "paid",
    statusLabel: "Paid"
  }
]

/** 对比表格方案列表 */
export const COMPARISON_PLAN_COLUMNS: ComparisonPlanColumn[] = [
  { id: "starter", name: "Starter", price: "$0", cadence: "forever" },
  { id: "pro", name: "Pro", price: "$24", cadence: "/seat/mo", highlight: true },
  { id: "enterprise", name: "Enterprise", price: "$48", cadence: "/seat/mo" },
  { id: "custom", name: "Custom", price: "定制", cadence: "annual" }
]

/** 对比表格三层特性明细 */
export const COMPARISON_SECTIONS: ComparisonSection[] = [
  {
    title: "Workspace & Agents (工作区与智能体)",
    rows: [
      { label: "工程项目数", values: ["3", "无限", "无限", "无限"] },
      { label: "活跃团队席位", values: ["5", "25", "100", "无限"] },
      { label: "月度 API Token 吞吐", values: ["100k", "5M", "50M", "私有集群专享"] },
      { label: "并发后台任务 Agent", values: ["1", "3", "10", "不限"] }
    ]
  },
  {
    title: "Security & Governance (安全与治理)",
    rows: [
      { label: "SafeStorage 硬件密钥隔离", values: [true, true, true, true] },
      { label: "自定义团队角色与鉴权", values: [false, true, true, true] },
      { label: "SAML 2.0 / SCIM 统一登录", values: [false, false, true, true] },
      { label: "审计日志留存周期", values: ["7 天", "30 天", "1 年", "永久留存"] }
    ]
  },
  {
    title: "Support & SLA (技术支持与服务)",
    rows: [
      { label: "社区互助与开源支持", values: [true, true, true, true] },
      { label: "工单优先响应 SLA", values: [false, true, true, true] },
      { label: "专属系统架构师支持", values: [false, false, false, true] }
    ]
  }
]

/** 升级与选配支持的 3 档定价阶梯 */
export const UPGRADE_TIER_PLANS: UpgradeTierPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPricePerSeat: 0,
    yearlyPricePerSeat: 0,
    blurb: "适合个人工程师与轻量探索",
    features: ["1 工作区", "3 项目工程", "5 协作者", "社区支持"]
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPricePerSeat: 24,
    yearlyPricePerSeat: 19,
    blurb: "适合高速成长的中小型产研团队",
    badge: "Most popular",
    primary: true,
    defaultSeats: 5,
    features: [
      "无限工程项目",
      "5M API Tokens/月",
      "30天审计日志",
      "优先邮件技术支持",
      "Google Workspace SSO"
    ]
  },
  {
    id: "enterprise",
    name: "Team Enterprise",
    monthlyPricePerSeat: 48,
    yearlyPricePerSeat: 38,
    blurb: "适合具备合规与高并发诉求的研发组织",
    defaultSeats: 10,
    features: [
      "包含 Pro 全部权益",
      "50M 专属 Token 配额",
      "SAML SSO + SCIM 组织鉴权",
      "1年审计日志永久回溯",
      "专属技术架构师对接"
    ]
  }
]
