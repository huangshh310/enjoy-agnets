/** 收件箱消息中心。 */
export const zhInboxPages = {
  searchPlaceholder: "搜索消息与通知…",
  navGroup: "消息",
  navAll: "全部消息",
  navUnread: "未读",
  navAgent: "智能体运行",
  navSystem: "系统与安全",
  title: "收件箱",
  breadcrumb: "收件箱 > {section}",
  unreadCount: "{n} 未读",
  allCaughtUp: "已全部处理",
  markAllRead: "全部标为已读",
  clearRead: "清理已读",
  empty: "没有符合条件的消息",
  emptyHint: "换一个分类，或清空搜索后再试。",
  groupToday: "今天",
  groupYesterday: "昨天",
  groupEarlier: "更早",
  justNow: "刚刚",
  minutesAgo: "{n} 分钟前",
  hoursAgo: "{n} 小时前",
  daysAgo: "{n} 天前",
  categoryAgent: "运行",
  categorySystem: "系统",
  markRead: "标为已读",
  markUnread: "标为未读",
  readerEmpty: "选择一条消息",
  readerEmptyHint: "从左侧时间线打开运行通知或系统警报。",
  actions: {
    openSession: "查看会话",
    openSandbox: "安全设置",
    openKnowledge: "知识库",
    openProviders: "模型管理",
    openTeam: "团队中心"
  },
  seed: {
    rustRefactorTitle: "Rust 登录逻辑模块重构成功",
    rustRefactorSummary:
      "ToolLoopAgent 已完成代码写入与单测覆盖，生成 10 个源码文件（+559 -0 行变更）。",
    shellApprovedTitle: "终端执行 Shell 命令已通过审批",
    shellApprovedSummary:
      "自动放行命令：curl -fsSL https://wttr.in/Shanghai?format=3，返回状态码 0。",
    hmacBoundTitle: "本地密钥与 HMAC 进程隔离生效",
    hmacBoundSummary:
      "当前会话的审批凭证已与 Electron 主进程 HMAC 令牌强制绑定，防止渲染层提权。",
    knowledgeIndexedTitle: "知识库向量索引增量更新完毕",
    knowledgeIndexedSummary: "当前工作区已索引 128 篇 Markdown 与代码文档，RAG 语义检索就绪。",
    contextCompactedTitle: "会话上下文自动压缩成功",
    contextCompactedSummary:
      "由于长会话接近 20 轮，已自动执行上下文修剪，节省 74% 冗余推理 Token。",
    engineReadyTitle: "Enjoy Agents 桌面端引擎已就绪",
    engineReadySummary:
      "当前运行版本 v0.1.0（Electron 39 + Node 22 + React 19），全能力特性矩阵开启。",
    providerHealthyTitle: "模型供应商网络连接正常",
    providerHealthySummary: "DeepSeek 与 Grok 自定义端点已连通，平均延迟 82ms，流式响应通畅。",
    teamWelcomeTitle: "欢迎加入 Enjoy Agents 核心工程组",
    teamWelcomeSummary: "您的账户 team@enjoy-agents.dev 已激活 Team Pro 计划，畅享多智能体协作流。"
  }
}
