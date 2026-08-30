import Editor from "@monaco-editor/react";

export function WorkspaceEditor({
  path,
  value,
  onChange,
  theme = "vs"
}: {
  path: string;
  value: string;
  onChange?: (value: string | undefined) => void;
  theme?: "vs" | "vs-dark";
}) {
  const language = languageFromPath(path);
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
  );
}

function languageFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "html":
      return "html";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}
