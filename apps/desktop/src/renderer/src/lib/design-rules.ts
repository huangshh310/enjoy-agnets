/**
 * UI 确定性规则与 Anti-Patterns 静态检查器：
 * 遵循 Vercel DESIGN.md 规范，将机械性 UI 违规转化为确定性代码检查。
 */

export const NAMED_ANTI_PATTERNS = [
  "Centered-Marketing-Hero",
  "Generic-SaaS-Card",
  "Invented-Raw-Styles",
  "Cramped-Evidence-Table",
  "Deconstructed-Typography",
  "Viewport-Trapped-Layout",
  "Fake-Status-Chrome",
  "Unsafe-Native-Dialog"
] as const

export type NamedAntiPattern = (typeof NAMED_ANTI_PATTERNS)[number]

export interface DesignManifestoValidation {
  valid: boolean
  missingAntiPatterns: string[]
  missingTokenCategories: string[]
}

/**
 * 校验 DESIGN.md 规约文件是否包含所有 8 大 Anti-Patterns 及核心 Token 类别。
 */
export function validateDesignManifesto(manifestoText: string): DesignManifestoValidation {
  const missingAntiPatterns: string[] = []
  for (const pattern of NAMED_ANTI_PATTERNS) {
    if (!manifestoText.includes(`[${pattern}]`) && !manifestoText.includes(pattern)) {
      missingAntiPatterns.push(pattern)
    }
  }

  const requiredTokenCategories = [
    "text-title-",
    "text-body-",
    "text-caption-",
    "bg-background-",
    "text-text-",
    "accent-500",
    "border-separator-border"
  ]
  const missingTokenCategories: string[] = []
  for (const token of requiredTokenCategories) {
    if (!manifestoText.includes(token)) {
      missingTokenCategories.push(token)
    }
  }

  return {
    valid: missingAntiPatterns.length === 0 && missingTokenCategories.length === 0,
    missingAntiPatterns,
    missingTokenCategories
  }
}

/**
 * 检查代码中是否违规使用了 `h-screen`（应使用 `min-h-[100dvh]` 或 `h-full`）。
 */
export function detectViewportTrappedLayout(code: string): string[] {
  const violations: string[] = []
  const lines = code.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ""
    // 忽略注释行
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue
    }
    // 匹配 className 里的 h-screen
    if (/\b(?:className|class)=["'`][^"'`]*\bh-screen\b[^"'`]*["'`]/.test(line)) {
      violations.push(`Line ${i + 1}: Found 'h-screen' class, use 'min-h-[100dvh]' or 'h-full' instead.`)
    }
  }
  return violations
}

/**
 * 检查代码中是否违规使用了原生 window.confirm 或 alert。
 */
export function detectUnsafeNativeDialog(code: string): string[] {
  const violations: string[] = []
  const lines = code.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ""
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue
    }
    if (/\bwindow\.(?:confirm|alert)\(/.test(line) || /(?<!\w)(?:confirm|alert)\(/.test(line)) {
      // 排除安全/测试场景
      if (!line.includes("ConfirmDialog") && !line.includes("AlertDialog") && !line.includes("test(")) {
        violations.push(`Line ${i + 1}: Found native alert/confirm call, use ConfirmDialog instead.`)
      }
    }
  }
  return violations
}

/**
 * 检查代码中的 className 是否包含硬编码十六进制色值（如 bg-[#121212]、text-[#fff]）。
 */
export function detectRawHexInClasses(code: string): string[] {
  const violations: string[] = []
  const lines = code.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ""
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      continue
    }
    // 检查 className 中的 #[hex] 模式
    const match = line.match(/(?:className|class)=["'`][^"'`]*\[#[0-9a-fA-F]{3,8}\][^"'`]*["'`]/)
    if (match) {
      violations.push(`Line ${i + 1}: Found hardcoded hex in class: ${match[0]}`)
    }
  }
  return violations
}
