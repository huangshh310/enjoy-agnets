/**
 * 团队中心：团队基本资料、存储配额与 Agent 安全策略。
 */
import { useState } from "react"
import {
  RiBankLine,
  RiCheckLine,
  RiDatabase2Line,
  RiSparklingFill
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { TeamProfileData } from "./team.types"

const INITIAL_PROFILE: TeamProfileData = {
  id: "team_enjoy_core",
  name: "Enjoy Agents Core Team",
  slug: "enjoy-core",
  plan: "Team Pro",
  createdAt: "2026-01-15",
  memberCount: 4,
  maxMembers: 10,
  storageUsedBytes: 1_288_490_188, // 1.2 GB
  storageMaxBytes: 10_737_418_240, // 10 GB
  monthlyTokenUsed: 1_420_000,
  monthlyTokenLimit: 50_000_000,
  defaultApprovalMode: "auto",
  allowCustomMcp: true
}

export function TeamProfileSection() {
  const t = useT()
  const [profile, setProfile] = useState<TeamProfileData>(INITIAL_PROFILE)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const storagePercent = Math.round((profile.storageUsedBytes / profile.storageMaxBytes) * 100)
  const tokenPercent = Math.round((profile.monthlyTokenUsed / profile.monthlyTokenLimit) * 100)

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部团队看板卡片 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
            <RiBankLine className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-title-3-semibold text-text-primary">{profile.name}</h2>
              <span className="rounded-full bg-accent-500/10 text-accent-600 border border-accent-500/20 px-2 py-0.2 text-[11px] font-mono font-semibold">
                {profile.plan}
              </span>
            </div>
            <p className="text-caption-1-regular text-text-tertiary">
              ID: <span className="font-mono text-text-secondary">{profile.id}</span> · {t("common.created") || "Created"} {profile.createdAt}
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="h-8 text-caption-1-medium gap-1.5">
          {saved ? <RiCheckLine className="size-3.5 text-white" /> : null}
          <span>{saved ? (t("common.saved") || "Saved") : (t("common.saveChanges") || "Save changes")}</span>
        </Button>
      </div>

      {/* 基础信息卡片 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">{t("settings.general.title") || "General details"}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">团队显示名称</label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="h-9 font-sans text-caption-1-regular"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption-1-medium text-text-secondary">团队标识符 (Slug)</label>
            <Input
              value={profile.slug}
              onChange={(e) => setProfile({ ...profile, slug: e.target.value })}
              className="h-9 font-mono text-caption-1-regular"
            />
          </div>
        </div>
      </div>

      {/* 配额与资源使用看板 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-headline-medium text-text-primary">团队配额与算力池</h3>
          <span className="text-caption-1-medium text-text-tertiary">席位占用: {profile.memberCount} / {profile.maxMembers}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 存储配额 */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/40">
            <div className="flex items-center justify-between text-caption-1-medium">
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <RiDatabase2Line className="size-4 text-accent-500" />
                知识库与云端存储
              </span>
              <span className="font-mono tabular-nums text-text-primary">1.2 GB / 10 GB</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-separator-border/60 overflow-hidden">
              <div className="h-full bg-accent-500 rounded-full" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          {/* Token 算力池 */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-separator-border/70 bg-background-secondary-default/40">
            <div className="flex items-center justify-between text-caption-1-medium">
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <RiSparklingFill className="size-4 text-amber-500" />
                共享模型算力池 (月度)
              </span>
              <span className="font-mono tabular-nums text-text-primary">1.42M / 50M</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-separator-border/60 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${tokenPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 团队智能体安全策略 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-separator-border/80 bg-background-primary-default p-5 shadow-2xs">
        <h3 className="text-headline-medium text-text-primary">智能体团队治理与安全</h3>
        
        <div className="flex flex-col divide-y divide-separator-border/60">
          <div className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">默认写盘审批策略</p>
              <p className="text-caption-2-regular text-text-tertiary">控制团队成员运行编码智能体时的默认放行规则</p>
            </div>
            <button
              type="button"
              onClick={() => setProfile({ ...profile, defaultApprovalMode: profile.defaultApprovalMode === "auto" ? "strict" : "auto" })}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border",
                profile.defaultApprovalMode === "auto"
                  ? "bg-accent-500/10 text-accent-600 border-accent-500/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border hover:bg-background-secondary-hover"
              )}
            >
              {profile.defaultApprovalMode === "auto" ? "自动放行安全操作" : "严格逐项审批"}
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption-1-medium text-text-primary">允许成员连接自定义 MCP 扩展</p>
              <p className="text-caption-2-regular text-text-tertiary">开启后团队成员可在本机接入符合规范的私有 MCP 工具</p>
            </div>
            <button
              type="button"
              onClick={() => setProfile({ ...profile, allowCustomMcp: !profile.allowCustomMcp })}
              className={cx(
                "px-3 py-1 rounded-lg text-caption-1-medium font-medium transition-colors border",
                profile.allowCustomMcp
                  ? "bg-state-success-text/10 text-state-success-text border-state-success-text/30"
                  : "bg-background-secondary-default text-text-secondary border-separator-border hover:bg-background-secondary-hover"
              )}
            >
              {profile.allowCustomMcp ? "已允许" : "已限制"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
