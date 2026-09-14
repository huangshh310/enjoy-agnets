/**
 * 技能中心（精选集市 / 全部能力库 / 技能包合集 / Agent 整备舱）页面词表。
 */

export const zhSkillsPages = {
  states: {
    curated: "精选",
    noneActive: "未装备到宿主目录",
    notMounted: "未导入",
    equipped: "已装备",
    healthOk: "正常",
    healthDrift: "内容漂移",
    healthMissing: "目标缺失",
    healthError: "异常"
  },

  uiCopy: {
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
  },

  hero: {
    spotlightBadge: "官方本周焦点推荐",
    runtimeLabel: "支持运行时:",
    installedFull: "已全套装备至 AI",
    installAll: "一键装备完整套件 ({n} 项能力)",
    trendingTitle: "热门能力榜 (Trending)",
    countItems: "{n} 项",
    installedShort: "已装",
    get: "获取",
    syncHint: "社区版本每周实时同步",
    offline: "100% 离线可用"
  },

  toolbar: {
    driftBadge: "{n} 处需同步",
    readyBadge: "{n} 项能力已就绪",
    readyAll: "状态就绪",
    subtitle: "为你的 AI 助手装备专业代码审查、UI 设计、文案创作等即插即用的领域超能力。",
    searchPlaceholder: "搜索技能名称或触发词…",
    createSkill: "新建技能",
    importSource: "导入来源",
    doctor: "Doctor 状态诊断",
    tabCurated: "精选集市",
    tabAll: "全部能力库",
    tabPacks: "技能包合集"
  },

  importDialog: {
    needWorkspace: "请先打开一个项目工作区后再安装到工作区",
    title: "导入技能来源 (Import Skill Sources)",
    gitTitle: "从开源 Git 仓库导入",
    gitPlaceholder: "例如: obra/superpowers 或 https://github.com/...",
    gitFetch: "拉取并挂载",
    localTitle: "选择本地已有技能目录",
    localDesc: "接入本机已有 Agent 技能或本地开发工作区",
    pickFolder: "选择文件夹",
    presetsTitle: "官方快速安装模版 (Quick Presets)",
    installGlobal: "装至全局",
    installWorkspace: "装至工作区"
  },

  armoryHeader: {
    activeBadge: "{n} 项能力已激活",
    standbyBadge: "整备中 · 待装配",
    goToStore: "发现精选技能",
    viewAll: "查看全局库",
    protocolLabel: "契约协议",
    projectDirLabel: "投影目录",
    tagsLabel: "专长标签"
  },

  emptyState: {
    titleNamed: "{agent} 助手尚未开启专属技能",
    titleGeneric: "尚未装配任何技能能力包",
    descNamed: "当前助手会消费宿主技能目录。去精选集市装备，或把本机已有技能导入宿主。",
    descGeneric: "技能是赋予 AI 助手在代码重构、全栈测试、UI 审美与复杂工程自动化等领域的即插即用超能力。",
    exploreStore: "探索精选技能集市",
    viewAllInstalled: "查看全部已安装技能",
    pickFolder: "选择本地技能文件夹"
  },

  card: {
    verified: "认证",
    activatedAgents: "宿主目录:",
    allUnselected: "包含的技能均为未勾选状态",
    countPrefix: "共 ",
    countSuffix: " 个专业能力",
    manage: "管理配置"
  },

  gridCard: {
    countSkills: "含 {n} 项专业超能力",
    getNow: "一键获取"
  },

  drawer: {
    closeDetail: "关闭技能详情",
    close: "关闭",
    copiedTrigger: "已复制触发指令",
    copyTrigger: "复制触发指令 {trigger}",
    revealFile: "定位源文件",
    delete: "删除"
  },

  curatedView: {
    emptyCategory: "该分类下暂无精选技能包"
  },

  itemCard: {
    details: "详情 →"
  },

  drawerBody: {
    targetsTitle: "生效目标助手",
    targetsHint: "点击行切换来源组投影",
    hostHint: "只投影到宿主目录；当前引擎会读这一份",
    projected: "已随来源组投影",
    workspaceLabel: "工作区:",
    instructionsTitle: "指令说明"
  },

  targets: {
    activeCount: "已激活 {enabled} / {total} 个目标环境",
    synced: "已同步生效",
    notProjected: "未挂载投影",
    hostDesc: "当前引擎只读宿主目录，不再复制到各家 ~/.claude 等路径。",
    hostOn: "已装备到宿主",
    hostOff: "未装备",
    workspaceBound: "当前工作区绑定:"
  },

  listPane: {
    listTitle: "包含的技能清单 ({n})",
    selectedSummary: "已勾选 {enabled} / {total} 项能力同步至目标",
    filterAll: "全部",
    filterEnabled: "已启用 ({n})",
    filterDisabled: "停用",
    searchPlaceholder: "在 {n} 项技能中过滤名称或指令…",
    noMatch: "未找到匹配的技能项",
    toggleAria: "切换 {name}",
    stateActive: "已激活",
    stateDormant: "已休眠",
    deleteAria: "删除技能",
    deleteTitle: "从磁盘移除此技能"
  },

  docInspector: {
    copied: "已复制",
    userInvocable: "用户可直接调用"
  },

  previewPane: {
    title: "SKILL.md · 规范实时预览",
    liveCompile: "实时编译联动",
    copyTitle: "复制生成的 SKILL.md",
    copied: "已复制",
    copy: "复制"
  },

  createDialog: {
    fallbackDescription: "技能简短描述",
    fallbackBody: "## 执行指引\n\n在此撰写你的 Agent 规则...",
    needWorkspace: "请先打开一个项目工作区后再创建工作区技能",
    title: "新建 Agent 专属超能力 (Create Skill Studio)",
    subtitle: "为你的 AI 助手定制领域规范、上下文指引与触发指令，即插即用自动挂载",
    footerHint: "创建后将自动完成规范校验并同步至对应 Agent 运行环境",
    cancel: "取消",
    create: "立即创建技能包"
  },

  recommendedPacks: {
    title: "专为 {agent} 优化的超能力套件 (Recommended Skillsets)",
    plugHint: "即插即用 · 开箱即用无需配置",
    countSkills: "{n} 项领域能力",
    equippedTo: "已导入宿主目录",
    linkTo: "导入到宿主目录",
    getAndEquip: "获取并导入宿主"
  },

  quickMatrix: {
    title: "从已有技能库导入宿主目录（{agent} 会读这一份）",
    activeCount: "已导入 {enabled} / {total} 个来源组",
    summary: "当前已接入 {sources} 个来源组共 {skills} 项能力。点击下方来源组胶囊可导入或卸下整个来源包；当前引擎只读宿主目录。",
    quickMountLabel: "导入宿主目录:",
    toggleTitle: "点击{action}该组全部 {n} 项能力到宿主目录",
    mount: "导入",
    unmount: "卸下",
    searchPlaceholder: "在已有 {n} 项技能库中过滤检索…",
    exploreLabel: "推荐探索:",
    clear: "清除",
    defaultDesc: "提供专业任务指令与上下文",
    slotTitle: "投影粒度是来源组：请用上方来源组胶囊导入或卸下，避免误操作整组"
  }
}

export type ZhSkillsPages = typeof zhSkillsPages
