/** Studio、自定义、自动化、窗口标题栏。 */
export const zhStudio = {
  newChat: "新对话",
  confirm: "确定",
  scanRefresh: "扫描刷新",
  copyCode: "复制代码",
  window: {
    brand: "enjoy AGENT IDE",
    minimize: "最小化",
    minimizeWindow: "最小化窗口",
    maximize: "最大化",
    maximizeWindow: "最大化窗口",
    restoreDown: "向下还原",
    restoreWindow: "还原窗口",
    closeWindow: "关闭窗口"
  },
  header: {
    controlCenter: "控制中心与能力",
    tabs: {
      overview: "全景大盘",
      grounding: "数据与上下文",
      extensions: "工具与扩展",
      ops: "编排与监控"
    }
  },
  hero: {
    title: "Agent Studio 控制中心",
    localFirst: "本地优先已启用",
    localFirstActive: "本地优先已就绪",
    tagline: "统一的创作与编排中枢。管理工作区文件、RAG 知识库、MCP 插件、工作流和自动化任务。",
    description: "统一的创作与编排中枢。管理工作区文件、RAG 知识库、MCP 插件、工作流和自动化任务。",
    workspace: "工作区",
    unnamedWorkspace: "未打开工作区",
    none: "无",
    knowledgeRag: "知识库 RAG",
    ragSources: "知识库 RAG",
    sourcesChunks: "{sources} 个来源 · {chunks} 个分块",
    mcpPlugins: "MCP 插件",
    mcpStatus: "MCP 插件",
    mcpActive: "{connected}/{total} 已连接 · {tools} 个工具",
    automations: "自动化",
    rulesRuns: "{rules} 条规则 · {runs} 次运行",
    latestPerf: "最近耗时"
  },
  assets: {
    title: "资产与知识",
    subtitle: "工作区、RAG 向量索引与多模态媒体",
    noWorkspace: "未打开工作区",
    activeRoot: "活动根目录",
    workspaceDesc: "当前工作区根目录与本地文件索引，由 Electron 原生文件监视驱动。",
    switchFolder: "切换文件夹",
    copyPath: "复制工作区路径",
    nativeFs: "经 Electron 主进程接入本机文件系统",
    openInChat: "在对话与文件中打开",
    indexing: "索引中",
    ready: "就绪",
    empty: "空",
    knowledgeTitle: "知识库（RAG）",
    knowledgeDesc: "语义检索与向量嵌入。",
    sources: "来源",
    chunks: "分块",
    manageKnowledge: "管理知识库",
    mediaTitle: "媒体工作室与多模态资产",
    assetCount: "{count} 个资产",
    mediaDesc: "生成图像、合成语音、转写音频，并管理项目媒体。",
    images: "图像",
    speech: "语音（TTS）",
    video: "视频",
    exportHint: "直接导出到工作区，带覆盖保护",
    openMedia: "打开媒体工作室"
  },
  orch: {
    title: "编排与扩展",
    subtitle: "MCP 插件、持久化执行流水线与自动化",
    mcpTitle: "MCP 插件中心与工具台",
    connected: "{connected}/{total} 已连接",
    tools: "{count} 个工具",
    mcpDesc: "通过模型上下文协议提供外部工具与沙箱 UI App。",
    mcpEmpty: "尚未注册 MCP 服务器。点击以连接 filesystem、postgres、github 等。",
    mcpFooter: "进程隔离在主进程 · UI App 在 iframe 沙箱中运行",
    manageMcp: "管理 MCP 服务器",
    running: "{count} 运行中",
    runs: "{count} 次运行",
    workflowsTitle: "持久化工作流",
    workflowsDesc: "带持久检查点的多步骤自主执行。",
    plan: "规划",
    act: "执行",
    verify: "验证",
    openWorkflows: "打开工作流",
    autoTitle: "自动化与触发规则",
    activeRules: "{count} 条生效规则",
    autoDesc: "手动触发或在文件保存时自动执行的开发者指令。",
    onSaveTriggers: "保存时触发",
    manualPrompts: "手动指令",
    autoFooter: "自动执行代码审计、测试套件与提交说明",
    configureAuto: "配置自动化"
  },
  insights: {
    title: "配置与洞察",
    subtitle: "提示定制与执行遥测追踪",
    rulesPersona: "规则与人设",
    customizeTitle: "Agent 定制",
    customizeDesc: "系统提示指令、规则文件引用与子 Agent 人设行为。",
    customizeRules: "定制提示规则",
    customizeAgent: "定制 Agent",
    logged: "{count} 条记录",
    obsTitle: "可观测性与遥测",
    obsDesc: "脱敏执行追踪、Token 吞吐、TTFO 延迟与 JSON 导出。",
    latest: "最近：{ms}ms",
    ttfo: "TTFO：{ms}ms",
    otelOff: "默认关闭 OTEL",
    viewMetrics: "查看指标与追踪"
  },
  customize: {
    group: "Agent 定制",
    instructions: "指令",
    skillsHub: "技能中心",
    projectRules: "项目规则",
    searchPlaceholder: "搜索定制项…"
  },
  instructions: {
    title: "全局系统指令",
    badge: "System Prompt 上下文",
    desc: "配置全局预置指令与开发习惯，会在每个 Agent 会话开始时自动注入到模型 System Prompt。",
    presetsHint: "常用行为指令预设（点击追加到末尾）：",
    clickToAppend: "点击追加",
    stats: "{chars} 字符 · {lines} 行",
    unsaved: "未保存更改",
    synced: "已同步",
    discard: "放弃更改",
    save: "保存指令",
    placeholder:
      "例如：严格优先采用局部针对性修改，避免重写完整文件。单文件控制在 300 行以内。在完成任务前必须运行验证命令。",
    helper: "编写明确的否定约束与验证门禁，能显著提高 Agent 代码产出质量。"
  },
  rules: {
    filterAll: "全部规则",
    title: "项目规则与规范",
    badge: "多 Agent 标准",
    desc: "统一扫描并管理 AGENTS.md、CLAUDE.md、Cursor MDC、GitHub Copilot 与 Windsurf 规则。",
    activeCount: "{count} 条已生效规则",
    newRule: "新建规则",
    searchPlaceholder: "搜索规则或文件…",
    emptyTitle: "未扫描到任何 Agent 规范规则文件",
    emptyHint:
      "当前工作区未检测到 AGENTS.md、.cursor/rules/*.mdc 或 CLAUDE.md。可从下方模版库一键写入。",
    noMatch: "未搜索到匹配的规则",
    match: "匹配：",
    revealTitle: "在文件管理器中定位",
    reveal: "定位文件",
    inspectTitle: "查看规则详情",
    inspect: "查看内容",
    deleteTitle: "删除规则文件",
    templatesTitle: "常用规范模版 · 一键写入项目",
    templatesHint: "点击可一键写入 .cursor/rules 或 AGENTS.md",
    writeMdc: "写入 Cursor MDC",
    writeAgents: "写入 AGENTS.md",
    copyContent: "复制内容",
    createTitle: "新建 Agent 规则文件",
    createDesc: "写入指定 Agent 规范，Agent 在编写代码时将严格遵守。",
    targetKind: "目标 Agent 规范",
    nameLabel: "规则标识",
    namePlaceholder: "例如：clean-diffs, test-coverage",
    globsLabel: "匹配路径 Globs",
    globsPlaceholder: "例如：*.ts,*.tsx 或 src/**/*.py",
    descLabel: "简要说明",
    descPlaceholder: "例如：代码修改与原子化提交规范",
    bodyLabel: "规则正文（Markdown）",
    bodyPlaceholder: "- 优先采用局部精准修改，避免重写完整文件。",
    writeRule: "写入规则",
    defaultContent: "# {name}\n- 在此填写规则说明。"
  },
  skills: {
    title: "Agent 技能中心与能力包",
    badge: "自动发现",
    desc: "自动扫描本机全局（~/.enjoy-agents/skills）与工作区目录下的 SKILL.md 技能包。",
    installedCount: "{count} 已安装",
    scopeCounts: "{global} 全局 · {workspace} 项目",
    newSkill: "新建技能",
    installedHeading: "当前电脑已安装技能（{count}）",
    searchPlaceholder: "搜索技能名称或路径…",
    emptyTitle: "未扫描到已安装的技能包",
    emptyHint: "全局目录 ~/.enjoy-agents/skills/ 或当前工作区中暂无 SKILL.md。可从下方精选模版中一键安装。",
    noMatch: "未搜索到匹配的技能",
    fallbackDesc: "包含自动化流程与技能说明",
    revealTitle: "在文件资源管理器中打开",
    reveal: "打开目录",
    inspectTitle: "查看 SKILL.md 详情",
    inspect: "查看 Spec",
    deleteTitle: "删除技能",
    templatesTitle: "精选技能模版库 · 一键安装接入",
    templatesHint: "点击直接写入本机全局或工作区",
    installed: "已安装",
    command: "指令：",
    viewTemplate: "查看模版 Spec",
    installGlobal: "安装至全局",
    installWorkspace: "安装至项目",
    inspectName: "{name} · SKILL.md",
    templateSpec: "模版规范",
    createTitle: "新建 Agent 技能包",
    createDesc: "在本地生成标准 SKILL.md 脚手架，Agent 将自动读取生效。",
    nameLabel: "技能标识",
    namePlaceholder: "例如：api-doc-writer, git-rebase-flow",
    descLabel: "简要说明",
    descPlaceholder: "例如：自动化撰写 API 规范并生成样例",
    scopeLabel: "作用域",
    scopeGlobal: "全局",
    scopeWorkspace: "项目",
    create: "创建技能包"
  },
  automations: {
    library: "库",
    allJobs: "全部任务",
    manualTrigger: "手动触发",
    onSaveHook: "保存时挂钩",
    searchPlaceholder: "搜索自动化…",
    title: "自动化与智能触发",
    badge: "后台挂钩",
    desc: "在文件保存时自动触发，或通过快捷命令手动执行的可重复 AI 任务。",
    newAutomation: "新建自动化",
    templatesTitle: "开箱即用自动化模版",
    templatesSubtitle: "一键启用并自定义",
    fileSaveHook: "文件保存挂钩",
    alreadyConfigured: "规则已在生效列表中",
    readyToEnable: "可以启用",
    addAnother: "再添加一条",
    enableRule: "启用规则",
    editTitle: "编辑自动化规则",
    createTitle: "新建自定义自动化",
    storedHint: "安全存储在本地 SQLite 数据库",
    nameLabel: "自动化名称",
    namePlaceholder: "例如：检查未提交的 Diff",
    triggerMode: "触发方式",
    onFileSaveHook: "文件保存时挂钩",
    promptLabel: "指令内容",
    presets: "预设：",
    promptPlaceholder: "输入触发时交给 Agent 执行的指令…",
    saveChanges: "保存更改",
    create: "创建自动化",
    configured: "已配置的自动化（{count}）",
    emptyTitle: "尚未配置自定义自动化",
    noMatchTitle: "没有匹配的自动化",
    emptyHint: "启用上方常用模版，或点击「{action}」创建自己的指令挂钩。",
    noMatchHint: "试试调整搜索词，或切换侧栏筛选。",
    idPrefix: "ID: {id}...",
    active: "生效",
    disableAria: "关闭自动化",
    enableAria: "启用自动化",
    editAria: "编辑自动化",
    deleteAria: "删除自动化",
    noPrompt: "未指定指令内容。",
    copyPrompt: "复制指令",
    onSave: "保存时",
    manual: "手动"
  },
  instructionPresets: {
    minimalDiffs: {
      label: "极简外科手术式修改",
      tag: "Minimal Diffs",
      text: "严格优先采用局部精准修改，避免重写完整文件。禁止添加复述代码的无意义注释。在声明任务完成前必须主动执行类型检查和验证命令。"
    },
    tddFirst: {
      label: "测试驱动开发 (TDD)",
      tag: "Test-Driven",
      text: "在修改核心业务逻辑前，先检查或补齐测试用例。主动运行测试套件并确保 100% 零回退，在输出中清晰汇报验证命令与覆盖情况。"
    },
    cleanArch: {
      label: "高内聚低耦合分层",
      tag: "Architecture",
      text: "严格遵循模块化分层治理（Anti-Spaghetti），单文件控制在 300 行以内。IPC 与 API 边界强制使用 Zod 严格校验，严禁使用 untyped any 变量。"
    },
    seniorPmUx: {
      label: "产品体验与 UI 设计",
      tag: "Product & UI",
      text: "以高级 AI 产品经理与资深 UI 设计师视角审视功能。注重流畅的用户动线、克制专业的信息层级与语义设计 Token，拒绝粗糙拼凑。"
    }
  },
  curatedSkills: {
    webSearch: {
      name: "Web Search & Fact Synthesis",
      category: "调研与引用",
      badge: "Toolchain",
      description: "支持多轮关键词检索、深度网页内容提取与带有真实可信引用的结构化报告生成。",
      slashCommand: "/research <topic>",
      template:
        "---\nname: web-search-researcher\ndescription: 多步网络检索、深度网页提取与事实引用报告\n---\n# Web Search & Fact Synthesis Skill\n当用户要求获取外部实时信息或第三方库文档时：\n1. 使用 search_web 工具构造 2-3 个精准检索词。\n2. 访问官方主文档并提取核心规范与 API 签名。\n3. 产出带有可点击 Markdown 外链的客观事实摘要。"
    },
    generativeUi: {
      name: "Generative UI & Rich Widgets",
      category: "前端可视化",
      badge: "Interactive UI",
      description: "在对话流中直接渲染交互式 React/HTML 组件、可视化图表、SVG 图解与响应式表单卡片。",
      slashCommand: "/chart 或 /ui <spec>",
      template:
        "---\nname: generative-ui-designer\ndescription: 在流式会话中渲染交互图表与富组件\n---\n# Generative UI Skill\n当需要可视化数据或交互界面时：\n1. 优先使用 BoardUI 语义 Token 配色。\n2. 输出自包含、安全沙箱兼容的交互组件。\n3. 保证在不同分辨率下的响应式适配。"
    },
    tddSynth: {
      name: "TDD & Test Suite Synthesizer",
      category: "质量保证",
      badge: "Testing",
      description: "深入分析边界条件与异常分支，自动合成单元测试、断言测试与回归测试用例。",
      slashCommand: "/test <file>",
      template:
        "---\nname: tdd-test-synthesizer\ndescription: 自动合成高覆盖率单元测试与边界断言\n---\n# TDD Test Synthesizer Skill\n编写与补充测试时：\n1. 检查目标函数签名、分支条件与边界异常。\n2. 编写独立解耦的测试用例（主路径、边界值、异常抛错）。\n3. 运行测试套件验证确保 100% 绿灯。"
    },
    securityAudit: {
      name: "Security Audit & SAST Scanner",
      category: "安全与合规",
      badge: "Security",
      description: "扫描代码库中潜在的 OWASP 漏洞、硬编码凭据、不安全命令插值与依赖 CVE 风险。",
      slashCommand: "/audit <path>",
      template:
        "---\nname: security-audit-scanner\ndescription: 代码库静态安全审计与修复补丁建议\n---\n# Security Audit Scanner Skill\n审计代码时：\n1. 排查未消毒输入、命令注入与敏感 Key 泄露。\n2. 输出结构化风险等级矩阵（高 / 中 / 低）。\n3. 提供可直接应用的安全性重构 Diff。"
    }
  },
  projectRules: {
    cleanDiffs: {
      title: "Clean Code & Surgical Diffs",
      category: "代码整洁",
      badge: "High Priority",
      description: "强制小粒度原子化修改，零多余冗余代码，单文件不超过 300 行。",
      content:
        "# Clean Code & Surgical Diffs Rule\n- 优先采用局部针对性修改，避免重写完整文件。\n- 单文件行数严格控制在 300 行以内；超出请主动抽取子模块。\n- 保留既有注释与文档，禁止添加复述代码的无意义行。\n- 严禁引入未格式化代码或多余的 debug log。"
    },
    strictTsZod: {
      title: "Strict TypeScript & Zod Schemas",
      category: "类型安全",
      badge: "Contract",
      description: "拒绝 any 类型转换，开启严格空值检查，IPC 与接口边界强制走 Zod runtime 解析。",
      content:
        "# Strict TypeScript & Zod Rule\n- 禁止使用 any 或未定型的强制类型转换；必须定义明确的 TypeScript 接口。\n- 所有 IPC 入参与出参必须通过 Zod Schema 进行严格运行时校验。\n- 类型与常量必须独立抽取到 *.types.ts 和 constants.ts 中，避免混杂在组件中。"
    },
    boarduiTokens: {
      title: "BoardUI Semantic Design Tokens",
      category: "视觉系统",
      badge: "UI Standard",
      description: "严格禁止写死 Hex 裸色值与随意灰阶，统一使用 BoardUI 语义 Token 与 Remixicon 图标。",
      content:
        "# BoardUI Semantic Design Tokens Rule\n- 严禁使用硬编码十六进制颜色 (#fff) 或非语义灰阶 (gray-500)。\n- 必须统一使用 BoardUI 语义 token: bg-background-primary-default, text-text-primary, accent-500。\n- 图标统一从 '@remixicon/react' 导入。"
    },
    tddVerification: {
      title: "Test-First Verification Gate",
      category: "验证门禁",
      badge: "Quality Gate",
      description: "在宣布任务完成前必须运行自动化验证命令（测试、类型检查），严防代码回退。",
      content:
        "# Test-First Verification Gate Rule\n- 在汇报任务完成前，必须执行 'pnpm typecheck' 和相关单测。\n- 发现任何类型报错或单测失败必须即刻定位修复。\n- 在最终回复中必须清晰汇报验证结果。"
    }
  },
  automationTemplates: {
    diffs: {
      name: "保存时审查 Git Diff",
      category: "代码质量",
      prompt: "文件保存时检查工作区最新未提交变更，并总结风险、安全问题与潜在回退。",
      badge: "持续审查"
    },
    todos: {
      name: "扫描 TODO 与安全气味",
      category: "技术债追踪",
      prompt: "扫描近期编辑文件中的 TODO、FIXME、HACK 注释与安全反模式，生成可执行摘要。",
      badge: "自动审计"
    },
    typecheck: {
      name: "类型检查与 Lint 修复",
      category: "诊断",
      prompt: "运行项目类型检查，找出类型不匹配或语法异常，并给出可直接应用的补丁 Diff。",
      badge: "一键诊断"
    },
    commitNotes: {
      name: "Conventional Commit 说明",
      category: "版本控制与发布",
      prompt: "将近期未提交变更整理为结构化 Conventional Commits 说明，便于写入 changelog。",
      badge: "智能 Changelog"
    }
  }
}
