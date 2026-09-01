/**
 * Agent 定制化预设数据：包含常用 Prompt 指令、精选技能包与项目规则模版。
 */
import {
  RiCodeSSlashLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"

/** 常用 System Prompt 行为指令预设 */
export const INSTRUCTION_PRESETS = [
  {
    id: "minimal-diffs",
    label: "极简外科手术式修改",
    tag: "Minimal Diffs",
    text: "严格优先采用局部精准修改，避免重写完整文件。禁止添加复述代码的无意义注释。在声明任务完成前必须主动执行类型检查和验证命令。"
  },
  {
    id: "tdd-first",
    label: "测试驱动开发 (TDD)",
    tag: "Test-Driven",
    text: "在修改核心业务逻辑前，先检查或补齐测试用例。主动运行测试套件并确保 100% 零回退，在输出中清晰汇报验证命令与覆盖情况。"
  },
  {
    id: "clean-arch",
    label: "高内聚低耦合分层",
    tag: "Architecture",
    text: "严格遵循模块化分层治理（Anti-Spaghetti），单文件控制在 300 行以内。IPC 与 API 边界强制使用 Zod 严格校验，严禁使用 untyped any 变量。"
  },
  {
    id: "senior-pm-ux",
    label: "产品体验与 UI 设计",
    tag: "Product & UI",
    text: "以高级 AI 产品经理与资深 UI 设计师视角审视功能。注重流畅的用户动线、克制专业的信息层级与语义设计 Token，拒绝粗糙拼凑。"
  }
]

/** 精选 Agent 技能包模版 (SKILL.md) */
export const CURATED_SKILLS = [
  {
    id: "web-search-researcher",
    name: "Web Search & Fact Synthesis",
    category: "调研与引用",
    badge: "Toolchain",
    icon: RiSparklingLine,
    description: "支持多轮关键词检索、深度网页内容提取与带有真实可信引用的结构化报告生成。",
    slashCommand: "/research <topic>",
    templateMarkdown: `---
name: web-search-researcher
description: 多步网络检索、深度网页提取与事实引用报告
---
# Web Search & Fact Synthesis Skill
当用户要求获取外部实时信息或第三方库文档时：
1. 使用 search_web 工具构造 2-3 个精准检索词。
2. 访问官方主文档并提取核心规范与 API 签名。
3. 产出带有可点击 Markdown 外链的客观事实摘要。`
  },
  {
    id: "generative-ui-designer",
    name: "Generative UI & Rich Widgets",
    category: "前端可视化",
    badge: "Interactive UI",
    icon: RiCodeSSlashLine,
    description: "在对话流中直接渲染交互式 React/HTML 组件、可视化图表、SVG 图解与响应式表单卡片。",
    slashCommand: "/chart 或 /ui <spec>",
    templateMarkdown: `---
name: generative-ui-designer
description: 在流式会话中渲染交互图表与富组件
---
# Generative UI Skill
当需要可视化数据或交互界面时：
1. 优先使用 BoardUI 语义 Token 配色。
2. 输出自包含、安全沙箱兼容的交互组件。
3. 保证在不同分辨率下的响应式适配。`
  },
  {
    id: "tdd-test-synthesizer",
    name: "TDD & Test Suite Synthesizer",
    category: "质量保证",
    badge: "Testing",
    icon: RiShieldCheckLine,
    description: "深入分析边界条件与异常分支，自动合成单元测试、断言测试与回归测试用例。",
    slashCommand: "/test <file>",
    templateMarkdown: `---
name: tdd-test-synthesizer
description: 自动合成高覆盖率单元测试与边界断言
---
# TDD Test Synthesizer Skill
编写与补充测试时：
1. 检查目标函数签名、分支条件与边界异常。
2. 编写独立解耦的测试用例（主路径、边界值、异常抛错）。
3. 运行测试套件验证确保 100% 绿灯。`
  },
  {
    id: "security-audit-scanner",
    name: "Security Audit & SAST Scanner",
    category: "安全与合规",
    badge: "Security",
    icon: RiTerminalBoxLine,
    description: "扫描代码库中潜在的 OWASP 漏洞、硬编码凭据、不安全命令插值与依赖 CVE 风险。",
    slashCommand: "/audit <path>",
    templateMarkdown: `---
name: security-audit-scanner
description: 代码库静态安全审计与修复补丁建议
---
# Security Audit Scanner Skill
审计代码时：
1. 排查未消毒输入、命令注入与敏感 Key 泄露。
2. 输出结构化风险等级矩阵（高 / 中 / 低）。
3. 提供可直接应用的安全性重构 Diff。`
  }
]

/** 项目规范与 Cursor / AGENTS.md 规则模版 */
export const PROJECT_RULES = [
  {
    id: "clean-diffs",
    title: "Clean Code & Surgical Diffs",
    targetFile: "AGENTS.md / .cursor/rules/clean-code.mdc",
    category: "代码整洁",
    badge: "High Priority",
    description: "强制小粒度原子化修改，零多余冗余代码，单文件不超过 300 行。",
    content: `# Clean Code & Surgical Diffs Rule
- 优先采用局部针对性修改，避免重写完整文件。
- 单文件行数严格控制在 300 行以内；超出请主动抽取子模块。
- 保留既有注释与文档，禁止添加复述代码的无意义行。
- 严禁引入未格式化代码或多余的 debug log。`
  },
  {
    id: "strict-ts-zod",
    title: "Strict TypeScript & Zod Schemas",
    targetFile: ".cursor/rules/typescript.mdc",
    category: "类型安全",
    badge: "Contract",
    description: "拒绝 any 类型转换，开启严格空值检查，IPC 与接口边界强制走 Zod runtime 解析。",
    content: `# Strict TypeScript & Zod Rule
- 禁止使用 any 或未定型的强制类型转换；必须定义明确的 TypeScript 接口。
- 所有 IPC 入参与出参必须通过 Zod Schema 进行严格运行时校验。
- 类型与常量必须独立抽取到 *.types.ts 和 constants.ts 中，避免混杂在组件中。`
  },
  {
    id: "boardui-tokens",
    title: "BoardUI Semantic Design Tokens",
    targetFile: ".cursor/rules/ui-tokens.mdc",
    category: "视觉系统",
    badge: "UI Standard",
    description: "严格禁止写死 Hex 裸色值与随意灰阶，统一使用 BoardUI 语义 Token 与 Remixicon 图标。",
    content: `# BoardUI Semantic Design Tokens Rule
- 严禁使用硬编码十六进制颜色 (#fff) 或非语义灰阶 (gray-500)。
- 必须统一使用 BoardUI 语义 token: bg-background-primary-default, text-text-primary, accent-500。
- 图标统一从 '@remixicon/react' 导入。`
  },
  {
    id: "tdd-verification",
    title: "Test-First Verification Gate",
    targetFile: "AGENTS.md / .cursor/rules/testing.mdc",
    category: "验证门禁",
    badge: "Quality Gate",
    description: "在宣布任务完成前必须运行自动化验证命令（测试、类型检查），严防代码回退。",
    content: `# Test-First Verification Gate Rule
- 在汇报任务完成前，必须执行 'pnpm typecheck' 和相关单测。
- 发现任何类型报错或单测失败必须即刻定位修复。
- 在最终回复中必须清晰汇报验证结果。`
  }
]
