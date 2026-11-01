/**
 * 符号地图格式化：超预算截断并注明 omitted。
 */
import { charBudgetFromTokens, REPO_MAP_TOKEN_BUDGET } from "./budgets.ts"

export type FileSymbols = {
  path: string
  signatures: string[]
}

export type FormatSymbolMapResult = {
  text: string
  omittedFiles: number
  omittedSignatures: number
  includedFiles: number
  charBudget: number
  approxTokens: number
}

export function formatSymbolMap(
  files: readonly FileSymbols[],
  options?: { tokenBudget?: number; header?: string }
): FormatSymbolMapResult {
  const tokenBudget = options?.tokenBudget ?? REPO_MAP_TOKEN_BUDGET
  const charBudget = charBudgetFromTokens(tokenBudget)
  const header =
    options?.header ??
    `# Workspace symbol map (~${tokenBudget} token budget)\nCall repo_outline again or use glob/grep for more.`
  const lines: string[] = [header]
  let remaining = Math.max(0, charBudget - header.length)
  let omittedFiles = 0
  let omittedSignatures = 0
  let includedFiles = 0

  for (const file of files) {
    const pathLine = `## ${file.path}`
    if (pathLine.length + 1 > remaining) {
      omittedFiles += 1
      omittedSignatures += file.signatures.length
      continue
    }
    const block: string[] = [pathLine]
    let blockCost = pathLine.length + 1
    let localOmitted = 0
    for (const sig of file.signatures) {
      const line = `- ${sig}`
      if (line.length + 1 > remaining - blockCost) {
        localOmitted += 1
        continue
      }
      block.push(line)
      blockCost += line.length + 1
    }
    // 无签名也保留路径行（grammar miss / 巨型文件跳过）。
    if (blockCost > remaining) {
      omittedFiles += 1
      omittedSignatures += file.signatures.length
      continue
    }
    lines.push(...block)
    remaining -= blockCost
    includedFiles += 1
    omittedSignatures += localOmitted
  }

  if (omittedFiles > 0 || omittedSignatures > 0) {
    lines.push(
      `[omitted: ${omittedFiles} file(s), ${omittedSignatures} signature(s) beyond ~${tokenBudget} token budget]`
    )
  }

  const text = lines.join("\n")
  return {
    text,
    omittedFiles,
    omittedSignatures,
    includedFiles,
    charBudget,
    approxTokens: Math.ceil(text.length / 4)
  }
}
