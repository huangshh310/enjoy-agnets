/**
 * 个人中心（账户详情 / 通知偏好）页面词表。
 */

export const zhAccountPages = {
  navProfile: "账户详情",
  navNotifications: "通知偏好",
  searchPlaceholder: "搜索个人账户设置...",
  crumbTitle: "个人中心",

  notifications: {
    title: "通知与提醒偏好",
    hint: "开关会写入本机偏好。需要你确认或任务结束时会弹出系统通知。",
    sectionTitle: "桌面通知",
    desktopTitle: "桌面通知",
    desktopDesc: "窗口在后台时，任务结束会弹出系统通知。",
    approvalTitle: "需要确认时弹出通知",
    approvalDesc: "改文件或运行命令要你点头时，会弹出系统通知。",
    soundTitle: "任务完成提示音",
    soundDesc: "任务结束通知是否带系统提示音。",
    on: "已开启",
    off: "已关闭"
  },

  security: {
    title: "密钥与本机保护",
    vaultProtected: "密钥存在系统钥匙串",
    vaultProtectedOther: "密钥存在系统密钥库",
    vaultNeutral: "密钥由本机保管",
    vaultEmpty: "未写入密钥",
    vaultSavedShort: "密钥已保存",
    vaultTitle: "本机加密存储",
    vaultDesc: "密钥由本机保管，此页只显示是否已保存，不会露出明文。",
    endpointLabel: "当前设备",
    currentDevice: "当前设备",
    thisComputer: "这台电脑 · {os}",
    thisComputerOnly: "这台电脑"
  },

  hero: {
    share: "分享",
    copied: "已复制",
    edit: "编辑",
    avatarHint: "点击定制头像",
    contributions: "本年花费约",
    yearSpend: "本年花费约 {amount}",
    lifetimeTokens: "累计用量",
    peakTokens: "峰值用量",
    longestTask: "最长任务",
    topStreak: "最长连续",
    peakHint: "单轮最高用量",
    streakHint: "连续有活动的天数",
    spendHint: "按本机记录估算",
    tokensHint: "累计对话用量",
    agentsHint: "助手调度次数",
    longestHint: "单次任务时长"
  },

  heatmap: {
    activity: "活跃度",
    count: "{n} 次",
    tooltip: "{date}: {n} 次活动",
    periodHintSuffix: "活动",
    weekly: "周",
    monthly: "月",
    yearly: "年",
    start: "开始",
    today: "今天",
    less: "少",
    more: "多"
  },

  charts: {
    tokens: "用量",
    agents: "助手",
    runsUnit: "次运行",
    day: "第 {n} 天"
  },

  editDialog: {
    title: "编辑个人资料与形象",
    blobatarLabel: "几何头像",
    blobatarMeta: "种子: {seed} · 表情: {expression}",
    customizeAvatar: "定制头像",
    fieldName: "用户昵称",
    placeholderName: "例如: Enjoy Engineer",
    fieldHandle: "社交代号",
    placeholderHandle: "例如: @enjoy-agents",
    fieldRole: "职位头衔",
    placeholderRole: "例如: Agent Engineer",
    fieldEmail: "电子邮箱",
    fieldTimezone: "时区",
    fieldExpression: "头像表情",
    fieldCover: "封面风格",
    cancel: "取消",
    saveChanges: "保存修改"
  },

  cover: {
    change: "更换特效封面",
    glyphRain: { label: "代码雨", desc: "数字代码粒子下落，游标扫过处激荡光芒" },
    hexFloat: { label: "悬浮棱镜", desc: "六边形倾斜悬浮地砖" },
    retroDither: { label: "复古点阵", desc: "有序抖动透镜" },
    frost: { label: "冰晶融冻", desc: "触碰融化的冰面透镜" }
  }
}

export type ZhAccountPages = typeof zhAccountPages
