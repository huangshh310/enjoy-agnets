/**
 * 工作区 Monaco：用本地 monaco-editor，不走 CDN。
 */
import { useEffect } from "react"
import Editor, { loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor"

loader.config({ monaco })

export function WorkspaceEditor({
  path,
  value,
  onChange,
  theme = "vs"
}: {
  path: string
  value: string
  onChange?: (value: string | undefined) => void
  theme?: "vs" | "vs-dark"
}) {
  useEffect(() => {
    loader.config({ monaco })
  }, [])
  const language = languageFromPath(path)
  return (
    <Editor
      height="100%"
      language={language}
      theme={theme}
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true
      }}
    />
  )
}

function languageFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase()
  switch (extension) {
    case "ts":
    case "tsx":
      return "typescript"
    case "js":
    case "jsx":
      return "javascript"
    case "json":
      return "json"
    case "css":
      return "css"
    case "md":
      return "markdown"
    case "html":
      return "html"
    case "py":
      return "python"
    default:
      return "plaintext"
  }
}
