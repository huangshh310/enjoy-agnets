import type { ReactNode } from "react"

const KEYWORD_PATTERN =
  /\b(const|let|var|return|import|from|export|default|function|if|else|type|interface|async|await|new|as)\b/g

export function highlightLine(line: string): ReactNode[] {
  if (line.trimStart().startsWith("//")) {
    return [
      <span key="comment" className="text-text-tertiary">
        {line}
      </span>
    ]
  }

  const nodes: ReactNode[] = []
  const tokenizer = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|return|import|from|export|default|function|if|else|type|interface|async|await|new|as)\b)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = tokenizer.exec(line)
  let tokenIndex = 0

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`plain-${tokenIndex}`}>{line.slice(lastIndex, match.index)}</span>)
    }
    const token = match[0] ?? ""
    const isString = token.startsWith("\"") || token.startsWith("'") || token.startsWith("`")
    nodes.push(
      <span
        key={`tok-${tokenIndex}`}
        className={isString ? "text-state-success-text" : "text-docs-command-accent"}
      >
        {token}
      </span>
    )
    lastIndex = match.index + token.length
    tokenIndex += 1
    match = tokenizer.exec(line)
  }

  if (lastIndex < line.length) {
    nodes.push(<span key="tail">{line.slice(lastIndex)}</span>)
  }

  return nodes.length > 0 ? nodes : [<span key="empty">{line}</span>]
}

void KEYWORD_PATTERN
