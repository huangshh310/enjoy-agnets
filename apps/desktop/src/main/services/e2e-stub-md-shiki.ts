/**
 * stub 夹具：吐多语言 Markdown 代码围栏，给气泡 Shiki 真机门用。
 * 仅 ENJOY_E2E_STUB=1；不改协议、不塞 raw HTML。
 */
import { isE2eStub } from "./e2e-stub-gate.ts"

export const STUB_MD_SHIKI_PROMPT = "md shiki fence"

export const STUB_MD_SHIKI_MARKDOWN = `围栏高亮样例：

\`\`\`ts
export function greet(name: string): string {
  // comment
  return \`hello \${name}\`
}
\`\`\`

\`\`\`tsx
export function Hi({ name }: { name: string }) {
  return <span className="accent">{name}</span>
}
\`\`\`

\`\`\`js
const add = (a, b) => a + b
console.log(add(1, 2))
\`\`\`

\`\`\`python
def greet(name: str) -> str:
    # comment
    return f"hello {name}"
\`\`\`

\`\`\`json
{ "ok": true, "langs": ["ts", "py", "go"] }
\`\`\`

\`\`\`bash
pnpm test --filter desktop
\`\`\`

\`\`\`go
package main

import "fmt"

func main() {
  fmt.Println("hello")
}
\`\`\`

单行 Run：

\`\`\`shell
echo hello-from-run
\`\`\`
`

export function isMdShikiFencePrompt(prompt: string): boolean {
  return isE2eStub() && /md\s+shiki\s+fence/i.test(prompt)
}
