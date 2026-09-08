/**
 * 技能工作模块 UI 常量与文案。
 */
import type { SkillSourceHealth, SkillTargetId } from "@enjoy-agents/ipc-contract"

export const SKILLS_UI_COPY = {
  moduleTitle: "Skills",
  moduleDesc: "Agent 技能中心与多目标编排：管理本机与开源社区技能包，一键投影至不同 Agent 运行环境。",
  allSources: "全部来源组",
  exploreCurated: "精选发现",
  targetFilter: "按目标 Agent 筛选",
  mySources: "我的技能组",
  sourcesCount: "来源组",
  deployedCount: "已安装技能",
  driftCount: "状态漂移",
  healthyState: "状态健康",
  repairAll: "一键修复全部目标",
  updateAll: "拉取更新",
  syncAll: "全部同步",
  importSource: "导入技能组",
  doctorTitle: "Doctor 状态诊断与自愈",
  doctorDesc: "对比权威状态 (manifest/lock) 与磁盘目标，检测文件丢失、修改漂移与配置冲突。",
  noIssues: "所有技能包投影完整一致，未发现状态漂移或损坏。",
  emptySkillDesc: "提供专业提示词与执行指引能力",
  emptyTitle: "尚未添加任何技能工作流",
  emptyDesc: "粘贴开源技能仓库地址快速导入，或从下方精选推荐中一键安装常用 Agent 技能包。",
  quickGitPlaceholder: "输入 GitHub 简写 (如 obra/superpowers, garrytan/gstack) 或 HTTPS 链接",
  addGitBtn: "快速拉取",
  pickFolderBtn: "选择本地技能目录",
  featuredTitle: "社区精选工作流库",
  featuredSubtitle: "由全球开发者与机构开源的高分技能套件，点击即可快速体验：",
  oneClickInstall: "一键导入",
  installedTag: "已添加",
  backToList: "返回来源组列表",
  targetDeployments: "Agent 目标投影 (Target Deployments)",
  targetDeploymentsDesc: "配置本工作流中的技能需要同步到哪些 Agent 运行环境：",
  skillsListTitle: "包含的技能清单 (Skills)",
  skillsListDesc: "勾选开启或关闭特定技能的部署投影：",
  skillDocTitle: "SKILL.md 文档检视",
  selectSkillHint: "在左侧列表中点击任一技能查看其详细说明与参数指令",
  copyDefinition: "复制定义",
  revealFolder: "在文件管理器中定位",
  redeploySource: "重新部署",
  pullUpdates: "拉取最新更新",
  removeSource: "移除来源组",
  deleteSkill: "删除技能",
  confirmRemoveTitle: "确认移除该技能组？",
  confirmRemoveDesc: "Git 来源会注销记录并删除投影副本，不删远程仓库。本机发现的 Agent 目录只从列表隐藏，技能文件保留。",
  confirmDeleteSkillTitle: "确认删除该技能？",
  confirmDeleteSkillDesc: "将从本机技能目录删除此技能包。此操作不能撤销。",
  confirmDeployTitle: "重新部署此技能组？",
  confirmDeployDesc: "将重新把当前选中的技能文件覆盖投影至所有已启用的目标 Agent 目录中。",
  importDialogTitle: "导入",
  gitLabel: "Git HTTPS",
  gitPlaceholder: "owner/repo 或 https://github.com/…",
  gitAdd: "添加 Git",
  templates: "精选模版",
  createCustom: "新建技能"
} as const

export const TARGET_LABELS: Record<SkillTargetId, string> = {
  "enjoy-agents": "Enjoy Agents (~/.enjoy-agents/skills)",
  agents: "Standard Agents (~/.agents/skills)",
  claude: "Claude Code (~/.claude/skills)",
  codex: "Codex (~/.codex/skills)",
  cursor: "Cursor (~/.cursor/skills)",
  omp: "Oh My Pi (~/.omp/skills)",
  pi: "Pi Agent (~/.pi/agent/skills)",
  "workspace-agents": "当前工作区 .agents/skills",
  "workspace-claude": "当前工作区 .claude/skills",
  "workspace-cursor": "当前工作区 .cursor/skills",
  "workspace-skills": "当前工作区 skills/",
  "workspace-dot-skills": "当前工作区 .skills/"
}

export const TARGET_SHORT_LABELS: Record<SkillTargetId, string> = {
  "enjoy-agents": "Enjoy",
  agents: "Agents",
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  omp: "OMP",
  pi: "Pi",
  "workspace-agents": "WS Agents",
  "workspace-claude": "WS Claude",
  "workspace-cursor": "WS Cursor",
  "workspace-skills": "WS skills",
  "workspace-dot-skills": "WS .skills"
}

export const HEALTH_CONFIG: Record<
  SkillSourceHealth,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ok: {
    label: "正常",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500"
  },
  drift: {
    label: "内容漂移",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500 animate-pulse"
  },
  missing: {
    label: "目标缺失",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-500"
  },
  error: {
    label: "异常",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-500"
  }
}

export const GLOBAL_TARGET_IDS: SkillTargetId[] = [
  "enjoy-agents",
  "claude",
  "cursor",
  "codex",
  "pi",
  "omp"
]

export const WORKSPACE_TARGET_IDS: SkillTargetId[] = [
  "workspace-agents",
  "workspace-claude",
  "workspace-cursor",
  "workspace-skills"
]
