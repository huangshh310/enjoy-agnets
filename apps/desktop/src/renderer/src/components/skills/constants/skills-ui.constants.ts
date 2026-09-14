/**
 * 技能工作模块 UI 常量与文案。
 */
import type { SkillSourceHealth, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export const SKILLS_UI_COPY = {
  moduleTitle: "Skills",
  moduleDesc: "Agent 技能中心：技能装进宿主目录，当前引擎消费这一份。",
  allSources: "全部来源组",
  exploreCurated: "精选发现",
  targetFilter: "按目标 Agent 筛选",
  mySources: "我的技能组",
  sourcesCount: "来源组",
  deployedCount: "已安装技能",
  driftCount: "状态漂移",
  healthyState: "状态健康",
  repairAll: "一键修复全部目标",
  updateAll: "更新技能",
  updating: "正在更新…",
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
  targetDeployments: "宿主技能目录",
  targetDeploymentsDesc: "当前引擎只读宿主目录，不再复制到各家家目录。",
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
  confirmDeployDesc: "将把当前选中的技能覆盖写入宿主目录（Enjoy 与工作区 .agents/skills）。",
  importDialogTitle: "导入",
  gitLabel: "Git HTTPS",
  gitPlaceholder: "owner/repo 或 https://github.com/…",
  gitAdd: "添加 Git",
  templates: "精选模版",
  createCustom: "新建技能"
} as const

export function useSkillsUiCopy(): Record<keyof typeof SKILLS_UI_COPY, string> {
  const t = useT()
  return {
    moduleTitle: t("pages.skills.uiCopy.moduleTitle"),
    moduleDesc: t("pages.skills.uiCopy.moduleDesc"),
    allSources: t("pages.skills.uiCopy.allSources"),
    exploreCurated: t("pages.skills.uiCopy.exploreCurated"),
    targetFilter: t("pages.skills.uiCopy.targetFilter"),
    mySources: t("pages.skills.uiCopy.mySources"),
    sourcesCount: t("pages.skills.uiCopy.sourcesCount"),
    deployedCount: t("pages.skills.uiCopy.deployedCount"),
    driftCount: t("pages.skills.uiCopy.driftCount"),
    healthyState: t("pages.skills.uiCopy.healthyState"),
    repairAll: t("pages.skills.uiCopy.repairAll"),
    updateAll: t("pages.skills.uiCopy.updateAll"),
    updating: t("pages.skills.uiCopy.updating"),
    syncAll: t("pages.skills.uiCopy.syncAll"),
    importSource: t("pages.skills.uiCopy.importSource"),
    doctorTitle: t("pages.skills.uiCopy.doctorTitle"),
    doctorDesc: t("pages.skills.uiCopy.doctorDesc"),
    noIssues: t("pages.skills.uiCopy.noIssues"),
    emptySkillDesc: t("pages.skills.uiCopy.emptySkillDesc"),
    emptyTitle: t("pages.skills.uiCopy.emptyTitle"),
    emptyDesc: t("pages.skills.uiCopy.emptyDesc"),
    quickGitPlaceholder: t("pages.skills.uiCopy.quickGitPlaceholder"),
    addGitBtn: t("pages.skills.uiCopy.addGitBtn"),
    pickFolderBtn: t("pages.skills.uiCopy.pickFolderBtn"),
    featuredTitle: t("pages.skills.uiCopy.featuredTitle"),
    featuredSubtitle: t("pages.skills.uiCopy.featuredSubtitle"),
    oneClickInstall: t("pages.skills.uiCopy.oneClickInstall"),
    installedTag: t("pages.skills.uiCopy.installedTag"),
    backToList: t("pages.skills.uiCopy.backToList"),
    targetDeployments: t("pages.skills.uiCopy.targetDeployments"),
    targetDeploymentsDesc: t("pages.skills.uiCopy.targetDeploymentsDesc"),
    skillsListTitle: t("pages.skills.uiCopy.skillsListTitle"),
    skillsListDesc: t("pages.skills.uiCopy.skillsListDesc"),
    skillDocTitle: t("pages.skills.uiCopy.skillDocTitle"),
    selectSkillHint: t("pages.skills.uiCopy.selectSkillHint"),
    copyDefinition: t("pages.skills.uiCopy.copyDefinition"),
    revealFolder: t("pages.skills.uiCopy.revealFolder"),
    redeploySource: t("pages.skills.uiCopy.redeploySource"),
    pullUpdates: t("pages.skills.uiCopy.pullUpdates"),
    removeSource: t("pages.skills.uiCopy.removeSource"),
    deleteSkill: t("pages.skills.uiCopy.deleteSkill"),
    confirmRemoveTitle: t("pages.skills.uiCopy.confirmRemoveTitle"),
    confirmRemoveDesc: t("pages.skills.uiCopy.confirmRemoveDesc"),
    confirmDeleteSkillTitle: t("pages.skills.uiCopy.confirmDeleteSkillTitle"),
    confirmDeleteSkillDesc: t("pages.skills.uiCopy.confirmDeleteSkillDesc"),
    confirmDeployTitle: t("pages.skills.uiCopy.confirmDeployTitle"),
    confirmDeployDesc: t("pages.skills.uiCopy.confirmDeployDesc"),
    importDialogTitle: t("pages.skills.uiCopy.importDialogTitle"),
    gitLabel: t("pages.skills.uiCopy.gitLabel"),
    gitPlaceholder: t("pages.skills.uiCopy.gitPlaceholder"),
    gitAdd: t("pages.skills.uiCopy.gitAdd"),
    templates: t("pages.skills.uiCopy.templates"),
    createCustom: t("pages.skills.uiCopy.createCustom")
  }
}

export const TARGET_LABELS: Record<SkillTargetId, string> = {
  "enjoy-agents": "Enjoy Agents (~/.enjoy-agents/skills)",
  agents: "Standard Agents (~/.agents/skills)",
  claude: "Claude Code (~/.claude/skills)",
  codex: "Codex (~/.codex/skills)",
  cursor: "Cursor (~/.cursor/skills)",
  grok: "Grok Build (~/.grok/skills)",
  antigravity: "Antigravity (~/.gemini/antigravity/skills)",
  gemini: "Gemini CLI (~/.gemini/skills)",
  opencode: "OpenCode (~/.config/opencode/skills)",
  omp: "Oh My Pi (~/.omp/skills)",
  pi: "Pi Agent (~/.pi/agent/skills)",
  hermes: "Hermes (~/.hermes/skills)",
  amp: "Amp (~/.amp/skills)",
  deepseek: "DeepSeek (~/.deepseek/skills)",
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
  grok: "Grok",
  antigravity: "Antigravity",
  gemini: "Gemini",
  opencode: "OpenCode",
  omp: "OMP",
  pi: "Pi",
  hermes: "Hermes",
  amp: "Amp",
  deepseek: "DeepSeek",
  "workspace-agents": "WS Agents",
  "workspace-claude": "WS Claude",
  "workspace-cursor": "WS Cursor",
  "workspace-skills": "WS skills",
  "workspace-dot-skills": "WS .skills"
}

export function getHealthConfig(t?: (key: string) => string): Record<
  SkillSourceHealth,
  { label: string; badgeClass: string; dotClass: string }
> {
  return {
    ok: {
      label: t ? t("pages.skills.states.healthOk") : "正常",
      badgeClass: "bg-chart-success/15 text-chart-success-text border-chart-success/25",
      dotClass: "bg-chart-success"
    },
    drift: {
      label: t ? t("pages.skills.states.healthDrift") : "内容漂移",
      badgeClass: "bg-chart-warning/15 text-chart-warning-text border-chart-warning/25",
      dotClass: "bg-chart-warning animate-pulse"
    },
    missing: {
      label: t ? t("pages.skills.states.healthMissing") : "目标缺失",
      badgeClass: "bg-chart-danger/15 text-chart-danger-text border-chart-danger/25",
      dotClass: "bg-chart-danger"
    },
    error: {
      label: t ? t("pages.skills.states.healthError") : "异常",
      badgeClass: "bg-chart-danger/15 text-chart-danger-text border-chart-danger/25",
      dotClass: "bg-chart-danger"
    }
  }
}

export const HEALTH_CONFIG = getHealthConfig()

export const GLOBAL_TARGET_IDS: SkillTargetId[] = [
  "enjoy-agents",
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "omp",
  "hermes",
  "amp",
  "deepseek"
]

export const WORKSPACE_TARGET_IDS: SkillTargetId[] = ["workspace-agents"]

/** 宿主真源可勾选的投影目标；各家家目录只读发现。 */
export const HOST_DEPLOY_TARGET_IDS: SkillTargetId[] = ["enjoy-agents", "workspace-agents"]

export function isHostDeployTarget(id: SkillTargetId): boolean {
  return HOST_DEPLOY_TARGET_IDS.includes(id)
}
