/**
 * 解析 ~/.ssh/config 的具体 Host。忽略模式别名；不读私钥内容。
 */
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

export type SshConfigCandidate = {
  alias: string
  host: string
  user?: string
  port?: number
  identityFile?: string
}

const PATTERN = /[?*]/
const GIT_SCM = /^(github\.com|gitlab\.com|bitbucket\.org|gitee\.com|ssh\.dev\.azure\.com|codeup\.aliyun\.com)$/i

/** git 远程别名不是开发机，发现列表要丢掉。 */
export function isGitScmHost(host: string): boolean {
  const name = host.trim().replace(/^git@/, "").split(":")[0]?.toLowerCase() ?? ""
  return GIT_SCM.test(name)
}

export async function readSshConfigCandidates(configPath = join(homedir(), ".ssh", "config")): Promise<SshConfigCandidate[]> {
  try {
    const text = await readFile(configPath, "utf8")
    return parseSshConfig(text)
  } catch {
    return []
  }
}

export function parseSshConfig(text: string): SshConfigCandidate[] {
  const blocks = splitHostBlocks(text)
  const found: SshConfigCandidate[] = []
  for (const block of blocks) {
    for (const alias of block.aliases) {
      if (PATTERN.test(alias)) continue
      found.push({
        alias,
        host: block.hostName || alias,
        user: block.user,
        port: block.port,
        identityFile: block.identityFile
      })
    }
  }
  return found
}

type HostBlock = {
  aliases: string[]
  hostName?: string
  user?: string
  port?: number
  identityFile?: string
}

function splitHostBlocks(text: string): HostBlock[] {
  const blocks: HostBlock[] = []
  let current: HostBlock | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = stripComment(raw).trim()
    if (!line) continue
    const tokens = line.split(/\s+/)
    const key = tokens[0]?.toLowerCase()
    if (key === "host") {
      if (current) blocks.push(current)
      current = { aliases: tokens.slice(1).map(unquote) }
      continue
    }
    if (!current) continue
    applyKeyword(current, key, tokens.slice(1).join(" "))
  }
  if (current) blocks.push(current)
  return blocks
}

function applyKeyword(block: HostBlock, key: string | undefined, value: string) {
  const unquoted = unquote(value)
  if (key === "hostname") block.hostName = unquoted
  if (key === "user") block.user = unquoted
  if (key === "identityfile") block.identityFile = unquoted
  if (key === "port") {
    const port = Number(unquoted)
    if (Number.isInteger(port) && port > 0 && port <= 65535) block.port = port
  }
}

function stripComment(line: string): string {
  const index = line.indexOf("#")
  return index < 0 ? line : line.slice(0, index)
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}
