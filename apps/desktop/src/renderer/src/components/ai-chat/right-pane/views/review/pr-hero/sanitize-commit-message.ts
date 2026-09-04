/**
 * 去掉模型围栏/引号，留下可直接提交的说明。
 */

export function sanitizeCommitMessage(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^```(?:\w+)?\s*/u, "")
    .replace(/\s*```$/u, "")
    .replace(/^["'`]+|["'`]+$/gu, "")
    .trim()
  const lines = stripped.split(/\r?\n/u).filter((line) => line.trim())
  return lines.slice(0, 8).join("\n").slice(0, 400).trim()
}
