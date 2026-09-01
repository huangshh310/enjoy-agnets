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

export interface AgentStepNode {
  id: string
  kind: AgentStepKind
  title: string
  detail?: string
  command?: string
  output?: string
  exitCode?: number
  errorText?: string
  status: "pending" | "running" | "completed" | "error"
  domainPills?: DomainPill[]
  exploredPages?: SubPageItem[]
  exploredTitle?: string
  additions?: number
  deletions?: number
  rawText?: string
}
