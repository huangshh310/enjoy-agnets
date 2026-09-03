/**
 * 企业中心：企业开发基础设施与第三方协同工具集成列表。
 */
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiBox3Line,
  RiExternalLinkLine,
  RiGithubFill,
  RiSlackLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { CompanyIntegrationItem } from "./company.types"

const INITIAL_INTEGRATIONS: CompanyIntegrationItem[] = [
  {
    id: "github",
    name: "GitHub Enterprise",
    description: "同步代码审查、PR 分支自动比对与问题工单触发",
    category: "vcs",
    connected: true,
    account: "enjoy-agents/core",
    lastSyncAt: "5 分钟前"
  },
  {
    id: "slack",
    name: "Slack",
    description: "推送团队长耗时 Agent 任务完成通知与关键审批提醒",
    category: "collaboration",
    connected: true,
    account: "#agent-alerts",
    lastSyncAt: "10 分钟前"
  },
  {
    id: "linear",
    name: "Linear",
    description: "关联任务 Issue，双向同步开发分支与代码提交状态",
    category: "collaboration",
    connected: false
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "自动拉取生产报错堆栈，注入 Debug Agent 执行根因诊断",
    category: "monitoring",
    connected: false
  }
]

export function CompanyIntegrationsSection() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CompanyIntegrationItem[]>(INITIAL_INTEGRATIONS)

  function toggleConnect(id: string) {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              connected: !item.connected,
              account: !item.connected ? "已绑定组织" : undefined,
              lastSyncAt: !item.connected ? "刚刚" : undefined
            }
          : item
      )
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 顶部 MCP 桥接提醒 */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
            <RiBox3Line className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-title-3-semibold text-text-primary">第三方协同与开发集成</h2>
            <p className="text-caption-1-regular text-text-tertiary">
              将 Enjoy Agents 与您的版本控制、即时通讯及工单系统无缝连通
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="h-8 gap-1.5 text-caption-1-medium"
          onClick={() => void navigate({ to: "/mcp" })}
        >
          <span>查看已连接 MCP 协议</span>
          <RiExternalLinkLine className="size-3.5" />
        </Button>
      </div>

      {/* 集成卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between p-4 rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xs hover:border-border-button-hover transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-background-secondary-default border border-separator-border text-text-primary">
                  {item.id === "github" ? <RiGithubFill className="size-6" /> : null}
                  {item.id === "slack" ? <RiSlackLine className="size-6" /> : null}
                  {item.id === "linear" || item.id === "sentry" ? <RiBox3Line className="size-6 text-accent-500" /> : null}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-caption-1-semibold text-text-primary">{item.name}</span>
                  {item.connected && item.account ? (
                    <span className="font-mono text-[11px] text-text-tertiary">{item.account}</span>
                  ) : null}
                </div>
              </div>

              <span
                className={cx(
                  "rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold",
                  item.connected
                    ? "bg-state-success-text/10 text-state-success-text border border-state-success-text/20"
                    : "bg-background-secondary-default text-text-tertiary border border-separator-border"
                )}
              >
                {item.connected ? "已连接" : "未配置"}
              </span>
            </div>

            <p className="mt-3 text-caption-1-regular text-text-tertiary leading-relaxed">
              {item.description}
            </p>

            <div className="mt-4 pt-3 border-t border-separator-border/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-tertiary">
                {item.connected && item.lastSyncAt ? `同步: ${item.lastSyncAt}` : "支持一键配置鉴权"}
              </span>
              <Button
                size="sm"
                variant={item.connected ? "outline" : "default"}
                className="h-7 text-[11.5px]"
                onClick={() => toggleConnect(item.id)}
              >
                {item.connected ? "断开" : "立即连接"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
