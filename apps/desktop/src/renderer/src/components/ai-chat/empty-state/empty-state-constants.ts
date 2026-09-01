/**
 * 会话空状态（Zero State）常量配置与预设意图卡片
 */
import {
  RiCodeSSlashLine,
  RiFlaskLine,
  RiGitPullRequestLine,
  RiStackLine
} from "@remixicon/react"
import type { EmptyStateIntentItem, EmptyStateShortcutPill } from "./empty-state.types"

/** 预设高频工程意图卡片 */
export const DEFAULT_INTENT_CARDS: EmptyStateIntentItem[] = [
  {
    id: "git-review",
    title: "审查工作区改动",
    shortTitle: "审查改动",
    description: "分析未提交的代码差异（Git Diff），排查潜在缺陷与风险",
    tag: "Git Diff",
    icon: RiGitPullRequestLine,
    iconColor: "text-emerald-500 group-hover:text-emerald-500 dark:text-emerald-400",
    prompt: "请审查当前工作区中的未提交改动（Git Diff），指出潜在风险、类型安全隐患并给出优化建议。"
  },
  {
    id: "arch-explain",
    title: "梳理系统架构",
    shortTitle: "架构分析",
    description: "分析核心入口、依赖调用链路与关键模块状态流向",
    tag: "Architecture",
    icon: RiStackLine,
    iconColor: "text-indigo-500 group-hover:text-indigo-500 dark:text-indigo-400",
    prompt: "请分析当前工作区核心模块的架构设计、目录划分与关键数据流向，并指出潜在的重构与解耦机会。"
  },
  {
    id: "unit-test",
    title: "补全单元测试",
    shortTitle: "编写单测",
    description: "为核心业务逻辑编写覆盖边界条件与异常路径的测试用例",
    tag: "Testing",
    icon: RiFlaskLine,
    iconColor: "text-amber-500 group-hover:text-amber-500 dark:text-amber-400",
    prompt: "请为当前工作区中核心业务逻辑与工具函数编写覆盖完整边界条件的单元测试。"
  },
  {
    id: "refactor-clean",
    title: "识别重构机会",
    shortTitle: "优化重构",
    description: "扫描超长文件与混杂职责，提供符合单一职责原则的拆分方案",
    tag: "Refactor",
    icon: RiCodeSSlashLine,
    iconColor: "text-sky-500 group-hover:text-sky-500 dark:text-sky-400",
    prompt: "请检查当前工作区中超过 250 行或职责混杂的文件，给出符合关注点分离原则的模块化拆分方案。"
  }
]

/** 底部操作快捷提示胶囊 */
export const QUICK_SHORTCUT_PILLS: EmptyStateShortcutPill[] = [
  {
    id: "mention-file",
    label: "引用文件",
    keyHint: "@",
    description: "在输入框中精准检索并引用工程文件"
  },
  {
    id: "slash-action",
    label: "动作指令",
    keyHint: "/",
    description: "触发 /web 检索等内置 Agent 指令"
  },
  {
    id: "quick-search",
    label: "全局检索",
    keyHint: "⌘L",
    description: "随时呼出全局命令面板"
  }
]
