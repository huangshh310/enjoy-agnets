/**
 * 消息中心：支持分类过滤、8 项预置通知管理、全部标为已读与跳转。
 */
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiCheckDoubleLine,
  RiDeleteBinLine,
  RiInboxLine,
  RiMailUnreadLine,
  RiRobotLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { InboxCategory, InboxNotification } from "./inbox.types"

const INITIAL_NOTIFICATIONS: InboxNotification[] = [
  {
    id: "msg_1",
    title: "Rust 登录逻辑模块重构成功",
    summary: "ToolLoopAgent 已完成代码写入与单测覆盖，生成 10 个源码文件（+559 -0 行变更）。",
    category: "agent",
    read: false,
    createdAt: "10 分钟前",
    actionLabel: "查看会话",
    actionUrl: "/"
  },
  {
    id: "msg_2",
    title: "终端执行 Shell 命令已通过审批",
    summary: "自动放行命令：curl -fsSL https://wttr.in/Shanghai?format=3，返回状态码 0。",
    category: "agent",
    read: false,
    createdAt: "30 分钟前"
  },
  {
    id: "msg_3",
    title: "本地密钥与 HMAC 进程隔离生效",
    summary: "当前会话的审批凭证已与 Electron 主进程 HMAC 令牌强制绑定，防止渲染层提权。",
    category: "system",
    read: false,
    createdAt: "1 小时前",
    actionLabel: "安全设置",
    actionUrl: "/settings/sandbox"
  },
  {
    id: "msg_4",
    title: "知识库向量索引增量更新完毕",
    summary: "当前工作区已索引 128 篇 Markdown 与代码文档，RAG 语义检索就绪。",
    category: "system",
    read: false,
    createdAt: "2 小时前",
    actionLabel: "知识库",
    actionUrl: "/knowledge"
  },
  {
    id: "msg_5",
    title: "会话上下文自动压缩成功",
    summary: "由于长会话接近 20 轮，已自动执行上下文修剪，节省 74% 冗余推理 Token。",
    category: "agent",
    read: false,
    createdAt: "3 小时前"
  },
  {
    id: "msg_6",
    title: "Enjoy Agents 桌面端引擎已就绪",
    summary: "当前运行版本 v0.1.0（Electron 39 + Node 22 + React 19），全能力特性矩阵开启。",
    category: "system",
    read: false,
    createdAt: "1 天前"
  },
  {
    id: "msg_7",
    title: "模型供应商网络连接正常",
    summary: "DeepSeek 与 Grok 自定义端点已连通，平均延迟 82ms，流式响应通畅。",
    category: "system",
    read: false,
    createdAt: "1 天前",
    actionLabel: "模型管理",
    actionUrl: "/settings/providers"
  },
  {
    id: "msg_8",
    title: "欢迎加入 Enjoy Agents 核心工程组",
    summary: "您的账户 team@enjoy-agents.dev 已激活 Team Pro 计划，畅享多智能体协作流。",
    category: "system",
    read: false,
    createdAt: "2 天前",
    actionLabel: "团队中心",
    actionUrl: "/team/profile"
  }
]

export function InboxPage() {
  const t = useT()
  const navigate = useNavigate()
  const [items, setItems] = useState<InboxNotification[]>(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = useState<InboxCategory>("all")
  const [search, setSearch] = useState("")

  const unreadCount = items.filter((item) => !item.read).length

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "inbox_nav",
        label: t("chat.messages") || "Messages",
        items: [
          {
            id: "all",
            label: "全部消息",
            icon: RiInboxLine,
            meta: unreadCount > 0 ? String(unreadCount) : undefined
          },
          {
            id: "unread",
            label: "未读通知",
            icon: RiMailUnreadLine
          },
          {
            id: "agent",
            label: "智能体运行",
            icon: RiRobotLine
          },
          {
            id: "system",
            label: "系统与安全",
            icon: RiShieldCheckLine
          }
        ]
      }
    ],
    [t, unreadCount]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread" && item.read) return false
      if (filter === "agent" && item.category !== "agent") return false
      if (filter === "system" && item.category !== "system") return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q)
    })
  }, [items, filter, search])

  function markAllRead() {
    setItems(items.map((item) => ({ ...item, read: true })))
  }

  function toggleRead(id: string) {
    setItems(items.map((item) => (item.id === id ? { ...item, read: !item.read } : item)))
  }

  function clearRead() {
    setItems(items.filter((item) => !item.read))
  }

  return (
    <SecondaryPageShell
      searchPlaceholder="搜索收件箱消息与通知..."
      groups={navGroups}
      selectedId={filter}
      onSelect={(id) => setFilter(id as InboxCategory)}
      contentWidth="wide"
      searchValue={search}
      onSearchChange={setSearch}
      breadcrumbTitle={`收件箱 > ${filter === "unread" ? "未读通知" : "全部消息"}`}
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {/* 顶栏操作看板 */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
              <RiInboxLine className="size-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-title-3-semibold text-text-primary">收件箱与通知中心</h2>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-accent-500 text-white font-mono text-[11px] font-semibold px-2 py-0.2">
                    {unreadCount} 条未读
                  </span>
                ) : (
                  <span className="rounded-full bg-state-success-text/10 text-state-success-text border border-state-success-text/20 font-mono text-[11px] font-semibold px-2 py-0.2">
                    已全部处理
                  </span>
                )}
              </div>
              <p className="text-caption-1-regular text-text-tertiary">
                管理 Agent 运行通知、团队协作与系统安全警报
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <Button onClick={markAllRead} variant="outline" className="h-8 gap-1.5 text-caption-1-medium">
                <RiCheckDoubleLine className="size-3.5" />
                <span>全部标为已读</span>
              </Button>
            ) : null}
            <Button onClick={clearRead} variant="ghost" className="h-8 gap-1 text-caption-1-medium text-text-tertiary hover:text-text-error-primary">
              <RiDeleteBinLine className="size-3.5" />
              <span>清理已读</span>
            </Button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex flex-col gap-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-text-tertiary">
              <RiInboxLine className="size-12 stroke-1 mb-2 opacity-40" />
              <p className="text-body-medium">收件箱空空如也</p>
              <p className="text-caption-1-regular">暂无符合当前过滤条件的消息或通知</p>
            </div>
          ) : null}

          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={cx(
                "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none",
                item.read
                  ? "bg-background-primary-default border-separator-border/60 hover:border-separator-border"
                  : "bg-background-secondary-default/50 dark:bg-background-tertiary-default/40 border-accent-500/30 hover:border-accent-500/50 shadow-2xs"
              )}
            >
              {/* 未读状态指示点 */}
              <div className="mt-1 flex size-2 shrink-0 items-center justify-center">
                {!item.read ? (
                  <span className="size-2 rounded-full bg-accent-500 ring-4 ring-accent-500/15" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border-button-default" />
                )}
              </div>

              {/* 图标 */}
              <div className={cx(
                "flex size-9 items-center justify-center rounded-xl shrink-0 border",
                item.category === "agent"
                  ? "bg-accent-500/10 text-accent-600 border-accent-500/20"
                  : "bg-purple-500/10 text-purple-600 border-purple-500/20"
              )}>
                {item.category === "agent" ? <RiRobotLine className="size-4.5" /> : <RiShieldCheckLine className="size-4.5" />}
              </div>

              {/* 消息主体 */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cx(
                    "text-caption-1-semibold truncate",
                    item.read ? "text-text-secondary" : "text-text-primary"
                  )}>
                    {item.title}
                  </span>
                  <span className="font-mono text-caption-2-regular text-text-tertiary shrink-0">
                    {item.createdAt}
                  </span>
                </div>

                <p className="text-caption-1-regular text-text-tertiary leading-relaxed">
                  {item.summary}
                </p>

                {item.actionLabel && item.actionUrl ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11.5px] px-2.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        void navigate({ to: item.actionUrl as "/" })
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SecondaryPageShell>
  )
}
