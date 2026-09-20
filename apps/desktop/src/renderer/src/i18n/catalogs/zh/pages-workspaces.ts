/**
 * 工作区管理 / 创建项目 / Blobatar 头像定制页词表。
 */

export const zhWorkspacesPages = {
  list: {
    navAll: "全部项目与目录",
    pageTitle: "本地项目工作区",
    activeBadge: "活跃中",
    currentMount: "当前挂载: ",
    openFolder: "打开新文件夹",
    searchPlaceholder: "搜索文件夹名称或本地路径...",
    colName: "项目名称",
    colPath: "本地路径",
    colBranch: "Git 分支",
    colSessions: "会话数",
    colActions: "状态与操作",
    sessionCount: "{n} 组对话",
    currentActive: "当前已激活",
    switchTo: "切换到此工作区",
    shellSearchPlaceholder: "搜索工作区与文件夹路径...",
    crumbTitle: "工作区管理 > 文件夹与项目"
  },

  createProject: {
    typeLabel: "工作区切换",
    localTitle: "本机文件夹",
    localDesc: "选本机目录，行为与现在相同",
    remoteTitle: "远程 SSH…",
    comingSoon: "即将推出",
    remoteDesc: "连到一台机器上的目录。会话仍在本机。",
    remotePathHint: "浏览或填写远端已有目录，不会在远端新建空仓库",
    pickHost: "选择已保存的主机",
    newHost: "新主机…",
    connect: "连接",
    testHost: "测试连接",
    probeOk: "连接正常",
    browseRemote: "浏览",
    useRemoteDir: "使用此目录",
    remoteEmptyDir: "没有子目录",
    cancel: "取消",
    next: "下一步",
    pickFirst: "请先选择源文件夹",
    defaultSessionName: "新对话",
    createFailed: "创建项目失败",
    title: "创建项目",
    step1Desc: "打开位置，不是换引擎",
    testingHost: "正在测试…",
    hostReady: "主机已就绪，可测通连通性",
    pickHostFirst: "请先选择或配置主机",
    browseUp: "上一级",
    readingDir: "正在读取目录…",
    dirKind: "目录",
    step2Desc: "配置源文件路径与工作区名称",
    nameLabel: "项目名称",
    namePlaceholder: "例如：enjoy-agents",
    folderLabel: "源文件夹",
    folderPicked: "已选择源文件夹",
    changeFolder: "点击更换文件夹",
    folderHint: "添加 Enjoy 可读取和编辑的文件夹",
    browseHint: "点击浏览本机目录...",
    back: "返回上一步",
    create: "创建项目"
  },

  avatar: {
    seedLabel: "面孔种子: ",
    seedNameLabel: "种子名称 (驱动面孔五官几何哈希)",
    random: "随机生成",
    seedPlaceholder: "输入名字、邮箱或代号…",
    expressions: "表情风格 ({n} 种)",
    toneLabel: "主题色调预设",
    hueLabel: "色相角度 (Hue)",
    backdropLabel: "背景板形状",
    animateLabel: "动画表现",
    backdrop: { none: "无底板", circle: "圆形", squircle: "超椭圆", square: "方形" },
    animate: { always: "常驻呼吸", hover: "悬停微动", off: "静态节能" }
  }
}

export type ZhWorkspacesPages = typeof zhWorkspacesPages
