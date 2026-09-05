/**
 * 新建技能工坊 (Create Skill Studio) 预设模版与骨架。
 */
export interface SkillTemplatePreset {
  id: string
  title: string
  category: string
  defaultSlug: string
  defaultTrigger: string
  defaultDescription: string
  iconName: string
  skeletonBody: string
}

export const CREATE_SKILL_PRESETS: SkillTemplatePreset[] = [
  {
    id: "code-review",
    title: "深度代码审查与重构",
    category: "工程质量",
    defaultSlug: "code-review-pro",
    defaultTrigger: "/code-review",
    defaultDescription: "依据工程纪律与架构规约，深度审查代码变更，识别设计异味、边界漏洞与性能隐患。",
    iconName: "RiShieldCheckLine",
    skeletonBody: `## 核心定位与触发时机
当用户要求评审代码、检查 PR 或输入 \`/code-review\` 时执行本技能。

## 审查维度
1. **架构分层 (Architecture)**: 遵循单一职责、SOLID 原则与关注点分离，严禁巨型函数（不超过 50 行）。
2. **边界防御 (Edge Cases)**: 验证空指针、并发竞态、异步未捕获与类型收窄。
3. **性能与资源 (Performance)**: 避免无意义的对象深拷贝与无边界循环运算。

## 输出格式规范
- **阻断项 (Blocker)**: 影响正确性与安全的致命问题
- **建议项 (Warning)**: 可维护性与分层优化建议
- **重构样例 (Refactor Snippet)**: 提供符合项目风格的修正代码`
  },
  {
    id: "tdd-workflow",
    title: "TDD 测试先行循环",
    category: "测试自动化",
    defaultSlug: "tdd-synthesizer",
    defaultTrigger: "/tdd",
    defaultDescription: "采用红-绿-重构循环，在编写任何业务代码之前先构造具备充分破坏性的失败测试用例。",
    iconName: "RiFlaskLine",
    skeletonBody: `## 核心定位与触发时机
当用户启动新特性开发、修复 Bug 或输入 \`/tdd\` 时激活。

## 严格执行三步循环
1. **Red (红灯)**: 仅编写刚好能失败的测试用例，运行并确认失败原因为预期缺失逻辑。
2. **Green (绿灯)**: 编写最少量的最小实现代码，使测试恰好通过。
3. **Refactor (重构)**: 消除坏味道与重复代码，保持全量测试始终绿灯。

## 测试契约规则
- 测试行为与接口契约，不测试内部实现细节。
- 严禁为了凑测试覆盖率编写无断言或同义反复的测试。`
  },
  {
    id: "api-doc-writer",
    title: "API 接口规范与文档",
    category: "规范文档",
    defaultSlug: "api-spec-writer",
    defaultTrigger: "/api-doc",
    defaultDescription: "自动化扫描项目代码，提取路由定义、入参 Schema 与响应结果，生成 OpenAPI 规范文档。",
    iconName: "RiFileCodeLine",
    skeletonBody: `## 核心定位与触发时机
当用户需要梳理端点接口、撰写接口文档或执行 \`/api-doc\` 时触发。

## 执行指引
1. **分析路由定义**: 扫描代码中的 Controller、Router 或 IPC 频道，提取 URL、请求方法与鉴权要求。
2. **结构化提取 Schema**: 基于 Zod / TypeScript 接口提取入参字段类型、可选性与约束条件。
3. **输出 OpenAPI 规范**: 生成符合标准 OpenAPI 3.0 的 YAML 或清晰 Markdown 契约文档。`
  },
  {
    id: "impeccable-ui",
    title: "反平庸 UI/UX 设计审美",
    category: "前端设计",
    defaultSlug: "impeccable-ui",
    defaultTrigger: "/impeccable",
    defaultDescription: "注入专业级前端品味，审计视觉层级、响应式排版、触觉微动效与语义颜色 Token。",
    iconName: "RiPaletteLine",
    skeletonBody: `## 核心定位与触发时机
当用户提出“设计太普通”、“界面缺乏设计感”或需要 UI 改造时触发。

## 审美审查红线
1. **拒绝通用 SaaS 模板**: 杜绝无脑居中大 Hero 与单调平铺卡片，采用非对称 Bento 结构与数据脉冲。
2. **严格语义 Token**: 严禁直接裸写十六进制色值，严格使用设计系统语义复合字号与边框 Token。
3. **物理触觉反馈**: 按钮悬浮浮起、点击回弹缩放（active:scale-98）与自然流光氛围。`
  },
  {
    id: "custom-blank",
    title: "自定义空白技能",
    category: "自由创作",
    defaultSlug: "my-custom-skill",
    defaultTrigger: "/my-skill",
    defaultDescription: "从零构建全新的 Agent 超能力，自由定制专属工作流、提示词规则与工具调用链路。",
    iconName: "RiSparklingLine",
    skeletonBody: `## 核心定位与触发时机
在此描述该技能适用的业务场景与触发条件。

## 执行步骤与指引
1. 第一步：分析用户输入与上下文环境。
2. 第二步：执行特定逻辑与检查约束。
3. 第三步：交付符合标准的高质量成果。`
  }
]

/** 生成完整的规范 SKILL.md 内容 */
export function buildSkillMarkdownContent({
  name,
  description,
  trigger,
  body
}: {
  name: string
  description: string
  trigger: string
  body: string
}): string {
  const cleanTrigger = trigger.startsWith("/") ? trigger : `/${trigger}`
  const frontmatterLines = [
    "---",
    `name: ${name.trim()}`,
    `description: ${description.trim()}`,
    `trigger: ${cleanTrigger}`,
    "user-invocable: true",
    "version: 1.0.0",
    "---",
    ""
  ]

  return `${frontmatterLines.join("\n")}# ${name.trim()}\n\n${body.trim()}\n`
}
