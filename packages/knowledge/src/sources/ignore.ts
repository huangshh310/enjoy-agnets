/**
 * 知识库忽略：.git、构建目录、密钥文件、.gitignore 匹配项。
 */
const DEFAULT_IGNORES = [
  ".git",
  "node_modules",
  "dist",
  "out",
  "build",
  ".turbo",
  ".next",
  "coverage",
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "*.pem",
  "*.p12",
  "*.key"
]

export function parseGitignore(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

export function shouldIgnore(relativePath: string, extraPatterns: string[] = []): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "")
  const patterns = [...DEFAULT_IGNORES, ...extraPatterns]
  return patterns.some((pattern) => matchIgnore(normalized, pattern))
}

function matchIgnore(path: string, pattern: string): boolean {
  const clean = pattern.replace(/^\//, "").replace(/\/$/, "")
  if (clean.startsWith("*.")) {
    return path.endsWith(clean.slice(1))
  }
  if (path === clean || path.startsWith(`${clean}/`)) return true
  // 绝对路径里的 out/dist 可能是用户目录祖先，不能当构建产物忽略
  if (isAbsoluteLike(path)) return false
  return path.split("/").includes(clean)
}

function isAbsoluteLike(path: string): boolean {
  return /^[A-Za-z]:\//.test(path) || path.startsWith("/")
}
