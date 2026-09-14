/**
 * 社区精选 Agent 技能工作流库预置列表。
 * 前端直出，保证离线、加载态或主进程未重启时 100% 稳定呈现，杜绝空白卡死。
 */
import type { CuratedSkillSource } from "@enjoy-agents/ipc-contract"

export const CURATED_SKILL_SOURCES: CuratedSkillSource[] = [
  {
    id: "obra-superpowers",
    name: "obra/superpowers",
    title: "Superpowers for Agents",
    author: "@obra",
    locator: "obra/superpowers",
    description: "Jesse Vincent 的主流 Agent 工程工作流：头脑风暴、TDD 循环、深度代码审查与并行子 Agent 调度等。",
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
    description: "YC 总裁 Garry Tan 的现代 Agent 全栈套件：无头网页浏览 (Browse)、自动化测试与敏捷发布流水线。",
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
    description: "Anthropic 官方维护的通用 Agent 工具与技能范式集合，包含代码深度分析与文档处理。",
    category: "utility",
    tags: ["#Official", "#Core"],
    stars: 3500,
    skillCount: 12,
    featuredSkills: ["code-analysis", "document-reader", "task-orchestrator"]
  },
  {
    id: "clean-code-refactor",
    name: "refactor-expert/clean-code",
    title: "Clean Architecture & Refactoring",
    author: "@refactor-expert",
    locator: "refactor-expert/clean-code",
    description: "代码重构专家套件：坏味道自动化探测、SOLID 原则对齐、模块分层解耦与设计模式重构。",
    category: "engineering",
    tags: ["#Refactoring", "#Architecture", "#CleanCode"],
    stars: 4100,
    skillCount: 16,
    featuredSkills: ["code-smell-detector", "extract-service", "decouple-modules", "solid-audit"]
  },
  {
    id: "security-audit-skills",
    name: "sec-ops/agent-security-guard",
    title: "Code Security & Vulnerability Audit",
    author: "@sec-ops",
    locator: "sec-ops/agent-security-guard",
    description: "自动化代码安全审计：OWASP Top 10 检测、敏感秘钥扫描、依赖漏洞分析与防注入加固建议。",
    category: "engineering",
    tags: ["#Security", "#Audit", "#OWASP"],
    stars: 3200,
    skillCount: 11,
    featuredSkills: ["vulnerability-scan", "secret-detector", "auth-audit", "sql-injection-check"]
  },
  {
    id: "api-design-spec",
    name: "api-craft/rest-graphql-openapi",
    title: "API Craft & OpenAPI 3.1 Spec",
    author: "@api-craft",
    locator: "api-craft/rest-graphql-openapi",
    description: "工业级 API 架构设计：RESTful 规范校验、OpenAPI 3.1 契约生成与 GraphQL Schema 评审。",
    category: "engineering",
    tags: ["#API", "#OpenAPI", "#Backend"],
    stars: 2800,
    skillCount: 10,
    featuredSkills: ["openapi-lint", "rest-design", "contract-test-gen"]
  },
  {
    id: "tdd-test-automation",
    name: "test-ninja/automated-testing-pack",
    title: "TDD & Automated Test Ninja",
    author: "@test-ninja",
    locator: "test-ninja/automated-testing-pack",
    description: "全面测试工程工作流：高质量单元测试生成、Mock 模拟器脚手架、边界条件推导与 E2E 验证。",
    category: "engineering",
    tags: ["#Testing", "#TDD", "#Quality"],
    stars: 1900,
    skillCount: 12,
    featuredSkills: ["unit-test-gen", "edge-case-finder", "mock-factory", "e2e-scaffold"]
  },
  {
    id: "devops-docker-k8s",
    name: "cloud-native/devops-k8s-pipelines",
    title: "Cloud Native DevOps & CI/CD",
    author: "@cloud-native",
    locator: "cloud-native/devops-k8s-pipelines",
    description: "云原生工程流水线：Dockerfile 体积极致调优、K8s 清单与 Helm Chart 生成、GitHub Actions CI 编排。",
    category: "utility",
    tags: ["#DevOps", "#Docker", "#Kubernetes", "#CI/CD"],
    stars: 3600,
    skillCount: 14,
    featuredSkills: ["dockerfile-optimize", "k8s-manifest-gen", "github-actions-builder"]
  },
  {
    id: "markdown-docs-pro",
    name: "doc-master/technical-writing",
    title: "Technical Writing & RFC Docs",
    author: "@doc-master",
    locator: "doc-master/technical-writing",
    description: "专业技术文档撰写：系统架构设计说明书、技术 RFC 提案、API 开发手册与高可读 Markdown 排版。",
    category: "content",
    tags: ["#Docs", "#Writing", "#RFC"],
    stars: 2400,
    skillCount: 8,
    featuredSkills: ["rfc-generator", "architecture-doc", "api-reference-writer"]
  }
]
