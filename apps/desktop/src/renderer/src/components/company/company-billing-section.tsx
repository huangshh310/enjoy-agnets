/**
 * 企业中心：账单计划、席位配置与发票记录。
 */
import { useState } from "react"
import {
  RiBankCardLine,
  RiDownload2Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { BillingPlanInfo } from "./company.types"

const INITIAL_PLAN: BillingPlanInfo = {
  name: "Team Enterprise",
  priceMonthly: 199,
  interval: "year",
  seatsUsed: 4,
  seatsTotal: 10,
  renewsAt: "2027-01-15",
  status: "active"
}

export function CompanyBillingSection() {
  const [plan] = useState<BillingPlanInfo>(INITIAL_PLAN)

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部套餐总览 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
            <RiBankCardLine className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-semibold text-text-primary">{plan.name}</h2>
              <span className="rounded-full bg-state-success-text/10 text-state-success-text border border-state-success-text/20 px-2 py-0.2 text-[11px] font-mono font-semibold">
                订阅生效中
              </span>
            </div>
            <p className="text-caption-1-regular text-text-tertiary">
              续费日期: <span className="font-mono text-text-secondary">{plan.renewsAt}</span> · 按年计费享受 20% 优惠
            </p>
          </div>
        </div>

        <Button variant="outline" className="h-8 text-caption-1-medium">
          管理套餐与席位
        </Button>
      </div>

      {/* 席位与当前周期资源占用 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-separator-border/70 bg-background-primary-default shadow-2xs">
          <span className="text-caption-1-medium text-text-tertiary">活跃工程师席位</span>
          <div className="flex items-baseline gap-1">
            <span className="text-title-2-semibold text-text-primary font-mono">{plan.seatsUsed}</span>
            <span className="text-caption-1-regular text-text-tertiary font-mono">/ {plan.seatsTotal} 席位</span>
          </div>
          <div className="h-1 w-full rounded-full bg-separator-border/60 overflow-hidden mt-1">
            <div className="h-full bg-accent-500" style={{ width: `${(plan.seatsUsed / plan.seatsTotal) * 100}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-separator-border/70 bg-background-primary-default shadow-2xs">
          <span className="text-caption-1-medium text-text-tertiary">本周期 Token 消耗</span>
          <div className="flex items-baseline gap-1">
            <span className="text-title-2-semibold text-text-primary font-mono">1.42M</span>
            <span className="text-caption-1-regular text-text-tertiary font-mono">/ 50M 额度</span>
          </div>
          <span className="text-caption-2-medium text-state-success-text">用量平稳 · 剩余 97%</span>
        </div>

        <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-separator-border/70 bg-background-primary-default shadow-2xs">
          <span className="text-caption-1-medium text-text-tertiary">预估下次发票金额</span>
          <span className="text-title-2-semibold text-text-primary font-mono">$199.00</span>
          <span className="text-caption-2-regular text-text-tertiary">将于 2027-01-15 自动扣缴</span>
        </div>
      </div>

      {/* 支付方式与对公账户 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">企业支付与对公结算</h3>
        
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/40">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-background-primary-default border border-separator-border font-mono text-xs font-bold text-text-primary">
              VISA
            </div>
            <div className="flex flex-col">
              <span className="text-caption-1-medium text-text-primary font-mono">•••• •••• •••• 8848</span>
              <span className="text-caption-2-regular text-text-tertiary font-mono">到期日: 08/29 · 企业主卡</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-caption-2-medium">编辑</Button>
        </div>
      </div>

      {/* 历史账单发票记录 */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
        <div className="p-4 border-b border-separator-border/70 flex items-center justify-between">
          <h3 className="text-headline-medium text-text-primary">历史计费发票</h3>
          <span className="text-caption-2-regular text-text-tertiary">支持下载 PDF 格式的凭据</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-separator-border/70 bg-background-secondary-default/50 text-text-tertiary font-medium">
                <th className="py-2.5 px-4">发票编号</th>
                <th className="py-2.5 px-4">计费周期</th>
                <th className="py-2.5 px-4">结算金额</th>
                <th className="py-2.5 px-4">状态</th>
                <th className="py-2.5 px-4 text-right">下载凭证</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator-border/50 font-sans">
              <tr className="hover:bg-background-secondary-hover/40 transition-colors">
                <td className="py-3 px-4 font-mono text-text-primary">INV-2026-001</td>
                <td className="py-3 px-4 font-mono text-text-tertiary">2026-01-15 ~ 2027-01-15</td>
                <td className="py-3 px-4 font-mono font-semibold text-text-primary">$199.00</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium font-mono bg-state-success-text/10 text-state-success-text">
                    已缴清
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button type="button" className="inline-flex items-center gap-1 text-accent-600 hover:underline text-caption-2-medium">
                    <RiDownload2Line className="size-3" />
                    PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
