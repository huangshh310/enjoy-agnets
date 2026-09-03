/**
 * 企业中心：组织法人详情、企业域名与数据驻留合规协议。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiSchoolLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { CompanyDetailsData } from "./company.types"

const INITIAL_DETAILS: CompanyDetailsData = {
  legalName: "Enjoy Agents Intelligent Tech Inc.",
  domain: "enjoy-agents.dev",
  organizationId: "org_enjoy_global_01",
  complianceTier: "Enterprise Level 2 (SOC2 Type II + GDPR)",
  dataResidency: "local",
  zeroDataRetention: true,
  securityContact: "security@enjoy-agents.dev"
}

export function CompanyDetailsSection() {
  const [details, setDetails] = useState<CompanyDetailsData>(INITIAL_DETAILS)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部企业概览 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
            <RiSchoolLine className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-semibold text-text-primary">{details.legalName}</h2>
              <span className="rounded-full bg-state-success-text/10 text-state-success-text border border-state-success-text/20 px-2 py-0.2 text-[11px] font-mono font-semibold">
                官方企业认证
              </span>
            </div>
            <p className="text-caption-1-regular text-text-tertiary">
              组织识别码: <span className="font-mono text-text-secondary">{details.organizationId}</span>
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="h-8 text-caption-1-medium gap-1.5">
          {saved ? <RiCheckLine className="size-3.5 text-white" /> : null}
          <span>{saved ? "已更新" : "保存修改"}</span>
        </Button>
      </div>

      {/* 组织注册信息 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">企业登记与域名所有权</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">企业法定名称</label>
            <Input
              value={details.legalName}
              onChange={(e) => setDetails({ ...details, legalName: e.target.value })}
              className="h-9 font-sans text-caption-1-regular"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">企业主域名</label>
            <div className="relative flex items-center">
              <Input
                value={details.domain}
                onChange={(e) => setDetails({ ...details, domain: e.target.value })}
                className="h-9 font-mono text-caption-1-regular pr-16"
              />
              <span className="absolute right-2.5 text-[10px] font-semibold text-state-success-text bg-state-success-text/10 px-1.5 py-0.5 rounded">
                已验证
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 数据驻留与隐私合规保障 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">数据安全、隐私与数据驻留合规</h3>
        
        <div className="flex flex-col divide-y divide-separator-border/60">
          <div className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">本地优先隔离标准 (Local-First Isolation)</p>
              <p className="text-caption-2-regular text-text-tertiary">所有源码审查、Diff 计算与工作区读写仅在当前电脑主进程内执行，绝不上传第三方云</p>
            </div>
            <span className="text-state-success-text text-caption-2-medium font-semibold px-2 py-0.5 rounded-full bg-state-success-text/10">
              强制就绪
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">零数据留存协议 (Zero Data Retention - ZDR)</p>
              <p className="text-caption-2-regular text-text-tertiary">要求上游大模型供应商遵守 ZDR 协议，禁止将您的会话与代码用于模型训练</p>
            </div>
            <button
              type="button"
              onClick={() => setDetails({ ...details, zeroDataRetention: !details.zeroDataRetention })}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border",
                details.zeroDataRetention
                  ? "bg-state-success-text/10 text-state-success-text border-state-success-text/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border"
              )}
            >
              {details.zeroDataRetention ? "已开启 ZDR 协议" : "已关闭"}
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">企业安全与漏洞申报联络邮箱</p>
              <p className="text-caption-2-regular text-text-tertiary">{details.securityContact}</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[11.5px]">更新邮箱</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
