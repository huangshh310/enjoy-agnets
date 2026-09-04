/**
 * 精选热门 Agent 技能工作流来源库。
 * 收录主流开源高星技能仓库，支持在空态与精选页一键安装与多 Agent 部署。
 */
import type { CuratedSkillSource } from "@enjoy-agents/ipc-contract"

export const CURATED_SKILL_SOURCES: CuratedSkillSource[] = [
  {
    id: "obra-superpowers",
    name: "obra/superpowers",
    title: "Superpowers for Agents",
    author: "@obra",
    locator: "obra/superpowers",
    description: "Jesse Vincent 的主流 Agent 工程体系：头脑风暴、TDD 循环、深度代码审查与并行子 Agent 调度等。",
    category: "engineering",
    tags: ["#Development", "#Engineering", "#Popular"],
    stars: 2900,
    skillCount: 14,
    featuredSkills: ["brainstorming", "tdd", "code-review", "dispatching-parallel-agents"]
  },
  {
    id: "garrytan-gstack",
    name: "garrytan/gstack",
    title: "Gstack AI Agent Kit",
    author: "@garrytan",
    locator: "garrytan/gstack",
    description: "YC 总裁 Garry Tan 的现代 Agent 工具套件：无头网页浏览 (Browse)、自动化测试与敏捷发布流水线。",
    category: "engineering",
    tags: ["#Development", "#FullStack"],
    stars: 1280,
    skillCount: 6,
    featuredSkills: ["browse", "test", "build", "deploy"]
  },
  {
    id: "pbakaus-impeccable",
    name: "pbakaus/impeccable",
    title: "Impeccable Design & Frontend Taste",
    author: "@pbakaus",
    locator: "pbakaus/impeccable",
    description: "反平庸 AI 设计专家：前端视觉审美、微交互动效、排版校准与可访问性自动审计。",
    category: "design",
    tags: ["#Design", "#Frontend", "#UI/UX"],
    stars: 890,
    skillCount: 9,
    featuredSkills: ["design-taste-frontend", "polish", "audit", "bolder", "animate"]
  },
  {
    id: "jimliu-baoyu-skills",
    name: "JimLiu/baoyu-skills",
    title: "宝玉的创作技能包",
    author: "@JimLiu",
    locator: "JimLiu/baoyu-skills",
    description: "知名 AI 布道师宝玉的高效创作套件：文章专业插图生成、SVG 卡片排版、漫画分镜设计与英文长文精翻。",
    category: "content",
    tags: ["#Creation", "#Writing", "#Visual"],
    stars: 5700,
    skillCount: 22,
    featuredSkills: ["baoyu-article-illustrator", "baoyu-svg-card", "baoyu-translate"]
  },
  {
    id: "nextlevelbuilder-ui-ux-pro-max",
    name: "nextlevelbuilder/ui-ux-pro-max-skill",
    title: "UI/UX Pro Max Design System",
    author: "@nextlevelbuilder",
    locator: "nextlevelbuilder/ui-ux-pro-max-skill",
    description: "覆盖 50 种高阶设计风格、50 套字体排版方案与 20 种常用图表的可视化 UI/UX 专家技能。",
    category: "design",
    tags: ["#Design", "#UI/UX", "#Components"],
    stars: 2100,
    skillCount: 8,
    featuredSkills: ["ui-ux-pro-max", "design-tokens", "visual-hierarchy"]
  },
  {
    id: "anthropics-skills",
    name: "anthropics/skills",
    title: "Anthropic Official Skills Library",
    author: "@anthropics",
    locator: "anthropics/skills",
    description: "Anthropic 官方维护的通用 Agent 工具与技能范式集合，包含代码分析与文档处理。",
    category: "utility",
    tags: ["#Official", "#Core"],
    stars: 3500,
    skillCount: 12,
    featuredSkills: ["code-analysis", "document-reader", "task-orchestrator"]
  }
]
