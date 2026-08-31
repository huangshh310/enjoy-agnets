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
