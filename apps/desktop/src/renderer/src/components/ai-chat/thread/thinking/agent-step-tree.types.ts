/**
 * Agent Step Tree / Research Trail 类型定义
 * 支持完整命令查看、终端执行输出/报错回显、域名微标、子页面折叠与执行状态。
 */

export type AgentStepKind =
  | "search"      // 搜索与检索
  | "reading"     // 阅读网页或文件
  | "command"     // 命令行/终端执行
  | "editing"     // 代码与文件修改
  | "analysis"    // 分析与结论汇总
  | "thinking"    // 推理与意图规划
  | "delegate"    // 子智能体派工（Explore / General）

/** 子智能体人格：Explore 只读调查，General 跟父模式。文案不翻译。 */
export type SubagentKind = "explore" | "general"

/** 含 Stop 封口的已停止；渲染层不得把 stopped 当成 completed。 */
export type AgentStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "denied"
  | "skipped"
  | "stopped"

export interface DomainPill {
  id: string
  label: string
  url?: string
}

export interface SubPageItem {
  id: string
  title: string
  path?: string
  snippet?: string
}

export interface BatchFileItem {
  id: string
  path: string
  fileName: string
  fileDir: string
  actionVerb?: string
  additions?: number
  deletions?: number
  status: AgentStepStatus
}

export interface AgentStepNode {
  id: string
  kind: AgentStepKind
  title: string
  detail?: string
  command?: string
  output?: string
  exitCode?: number
  errorText?: string
  status: AgentStepStatus
  /** 用户拒绝审批：渲染「已拒绝」，不要红失败。 */
  denied?: boolean
  domainPills?: DomainPill[]
  exploredPages?: SubPageItem[]
  exploredTitle?: string
  additions?: number
  deletions?: number
  rawText?: string
  filePath?: string
  fileName?: string
  fileDir?: string
  actionVerb?: string
  isBatch?: boolean
  batchItems?: BatchFileItem[]
  /** Explore / General；仅 kind=delegate。 */
  subagentKind?: SubagentKind
  /** 派工标题，不含「子智能体 Explore ·」前缀。 */
  heading?: string
  /** 连续 ≥2 条顶层 delegate 的花名册容器。不要复用 isBatch / children。 */
  isRoster?: boolean
  rosterItems?: AgentStepNode[]
  children?: AgentStepNode[]
}
