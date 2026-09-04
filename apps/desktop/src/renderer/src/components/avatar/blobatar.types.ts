/**
 * Universal Blobatar 头像系统契约与配置类型定义：
 * 基于 https://blobatar.dev/ 构建的高性能确定性几何头像系统。
 */

/** 表情枚举字串 */
export type BlobatarExpressionName =
  | "idle"
  | "happy"
  | "wink"
  | "smug"
  | "thinking"
  | "love"
  | "surprised"
  | "shy"
  | "sleepy"
  | "sad"
  | "mad"

/** 背景底板形状 */
export type BlobatarBackgroundShape = "none" | "circle" | "squircle" | "square"

/** 动画模式 */
export type BlobatarAnimateMode = "always" | "hover" | "off"

/** 通用 Blobatar 完整配置对象 */
export interface BlobatarConfig {
  /** 种子名称（驱动头像唯一几何面孔的字符） */
  name: string
  /** 表情风格 */
  expression?: BlobatarExpressionName
  /** 色相角度 (0 ~ 360) */
  hue?: number
  /** 明度色调 (0: 极浅 ~ 1: 浓黑墨色) */
  tone?: number
  /** 背景底板形状 */
  background?: BlobatarBackgroundShape
  /** 动画模式 (实时呼吸 / 悬停微动 / 静态节能) */
  animate?: BlobatarAnimateMode
}

/** 预设默认配置 */
export const DEFAULT_BLOBATAR_CONFIG: BlobatarConfig = {
  name: "Enjoy Agents",
  expression: "idle",
  hue: 235,
  tone: 0.45,
  background: "squircle",
  animate: "always"
}

/** 常用推荐色调预设 */
export const BLOBATAR_COLOR_PRESETS: Array<{
  id: string
  label: string
  hue: number
  tone: number
  previewHex: string
}> = [
  { id: "signal-blue", label: "旗舰蓝", hue: 235, tone: 0.45, previewHex: "#4f46e5" },
  { id: "cyber-teal", label: "极客青", hue: 175, tone: 0.45, previewHex: "#0d9488" },
  { id: "violet-dream", label: "星云紫", hue: 275, tone: 0.45, previewHex: "#9333ea" },
  { id: "sunset-rose", label: "落日粉", hue: 345, tone: 0.48, previewHex: "#e11d48" },
  { id: "neon-amber", label: "赛博琥珀", hue: 42, tone: 0.48, previewHex: "#d97706" },
  { id: "matrix-emerald", label: "矩阵翡翠", hue: 152, tone: 0.46, previewHex: "#059669" },
  { id: "cool-slate", label: "冷石黑", hue: 215, tone: 0.82, previewHex: "#1e293b" },
  { id: "pure-coral", label: "珊瑚橘", hue: 18, tone: 0.48, previewHex: "#ea580c" }
]

/** 表情展示元信息配置 */
export const BLOBATAR_EXPRESSIONS: Array<{
  id: BlobatarExpressionName
  label: string
  desc: string
}> = [
  { id: "idle", label: "平常", desc: "自然待机呼吸" },
  { id: "happy", label: "开心", desc: "开朗眯眼笑意" },
  { id: "wink", label: "眨眼", desc: "俏皮单眼眨动" },
  { id: "smug", label: "得意", desc: "自信挑眉微笑" },
  { id: "thinking", label: "思考", desc: "聚精会神推演" },
  { id: "love", label: "喜爱", desc: "爱心泛红光晕" },
  { id: "surprised", label: "惊讶", desc: "圆睁大眼惊讶" },
  { id: "shy", label: "害羞", desc: "低头羞怯微赧" },
  { id: "sleepy", label: "困倦", desc: "眯缝惺忪疲倦" }
]

/** 随机灵感种子名录 */
export const RANDOM_AVATAR_SEEDS = [
  "Nexus Nova",
  "Cyber Ghost",
  "Pixel Pilot",
  "Vector Voy",
  "Quantum Q",
  "Aura Agent",
  "Solar Spark",
  "Echo Orbit",
  "Nebula Nomad",
  "Prism Pulse",
  "Atlas Apex",
  "Matrix Muse"
]
