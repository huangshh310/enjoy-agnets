/**
 * 按文件名 / 扩展名映射到 Shiki 语言，供打开文件预览高亮。
 */
import { extensionOf, fileNameOf } from "../../../lib/file-name.ts"

export type SyntaxLanguage =
  | "html"
  | "css"
  | "scss"
  | "less"
  | "javascript"
  | "jsx"
  | "typescript"
  | "tsx"
  | "json"
  | "jsonc"
  | "markdown"
  | "mdx"
  | "yaml"
  | "python"
  | "go"
  | "rust"
  | "bash"
  | "powershell"
  | "vue"
  | "xml"
  | "sql"
  | "toml"
  | "svelte"
  | "dockerfile"
  | "gitignore"
  | "ini"
  | "plaintext"

const BY_NAME: Record<string, SyntaxLanguage> = {
  dockerfile: "dockerfile",
  "docker-compose.yml": "yaml",
  "docker-compose.yaml": "yaml",
  ".gitignore": "gitignore",
  ".gitattributes": "ini",
  ".env": "ini",
  ".env.local": "ini",
  "package.json": "json",
  "tsconfig.json": "jsonc",
  "jsconfig.json": "jsonc"
}

const BY_EXT: Record<string, SyntaxLanguage> = {
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  "d.ts": "typescript",
  tsx: "tsx",
  json: "json",
  jsonc: "jsonc",
  md: "markdown",
  mdx: "mdx",
  yml: "yaml",
  yaml: "yaml",
  py: "python",
  go: "go",
  rs: "rust",
  sh: "bash",
  bash: "bash",
  ps1: "powershell",
  svg: "xml",
  xml: "xml",
  sql: "sql",
  toml: "toml",
  vue: "vue",
  svelte: "svelte",
  txt: "plaintext"
}

/** 从路径取出语言；未知扩展回退 plaintext。 */
export function languageFromPath(path: string): SyntaxLanguage {
  const name = fileNameOf(path)
  if (BY_NAME[name]) return BY_NAME[name]
  const ext = extensionOf(name)
  return (ext && BY_EXT[ext]) || "plaintext"
}

/** Fence info-string 别名 → Shiki 语言（ts/js/py/sh…）。 */
const BY_FENCE: Record<string, SyntaxLanguage> = {
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  js: "javascript",
  javascript: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  typescript: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  json: "json",
  jsonc: "jsonc",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  yml: "yaml",
  yaml: "yaml",
  py: "python",
  python: "python",
  go: "go",
  golang: "go",
  rs: "rust",
  rust: "rust",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  shellscript: "bash",
  console: "bash",
  fish: "bash",
  ps1: "powershell",
  powershell: "powershell",
  bat: "bash",
  cmd: "bash",
  vue: "vue",
  xml: "xml",
  svg: "xml",
  sql: "sql",
  toml: "toml",
  svelte: "svelte",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  ini: "ini",
  conf: "ini",
  txt: "plaintext",
  text: "plaintext",
  plain: "plaintext",
  plaintext: "plaintext"
}

/** Markdown 围栏语言标签；未知回退 plaintext。 */
export function languageFromFenceLang(lang: string): SyntaxLanguage {
  const key = lang.trim().toLowerCase()
  if (!key) return "plaintext"
  return BY_FENCE[key] ?? "plaintext"
}
