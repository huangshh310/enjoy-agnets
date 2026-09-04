/**
 * 技能来源 Git 来源：解析 HTTPS 地址、浅克隆与快进拉取。
 * SSH / git@ / http / 非 GitHub·GitLab 一律拒绝。
 */
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathIsInsideRoot } from "@enjoy-agents/db/path-safe"
import { runExecutable, runGit, type CommandResult } from "../command.ts"

const SHORTHAND = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const ALLOWED_HOSTS = new Set(["github.com", "gitlab.com"])

export type ParsedGitOrigin = {
  url: string
  sourceId: string
}

/** 将用户输入规范为 https clone URL 与安全目录名。 */
export function parseGitOrigin(origin: string): ParsedGitOrigin {
  const trimmed = origin.trim()
  if (!trimmed || isBlockedScheme(trimmed)) {
    throw new Error("UNSUPPORTED_SOURCE")
  }
  if (SHORTHAND.test(trimmed)) {
    return {
      url: `https://github.com/${trimmed}.git`,
      sourceId: trimmed.replace("/", "-").toLowerCase()
    }
  }
  return parseHttpsGitUrl(trimmed)
}

export function gitSourcesRoot(stateRoot: string): string {
  return join(stateRoot, "source", "git")
}

export function gitCheckoutPath(stateRoot: string, sourceId: string): string {
  const parent = resolve(gitSourcesRoot(stateRoot))
  const dest = resolve(join(parent, sourceId))
  if (!pathIsInsideRoot(parent, dest)) {
    throw new Error("Path is outside git source root.")
  }
  return dest
}

/** 只删除 stateRoot/source/git 的直接子目录。 */
export function removeGitCheckout(stateRoot: string, sourceId: string): void {
  const parent = resolve(gitSourcesRoot(stateRoot))
  const dest = gitCheckoutPath(stateRoot, sourceId)
  const destParent = resolve(dirname(dest))
  if (!pathIsInsideRoot(parent, dest)) {
    throw new Error("Path is outside git source root.")
  }
  if (!pathIsInsideRoot(parent, destParent) || !pathIsInsideRoot(destParent, parent)) {
    throw new Error("Refusing to delete nested git path.")
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
}

const GIT_NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GCM_INTERACTIVE: "never"
}

const GIT_NO_PROXY_ENV = {
  ...GIT_NO_PROMPT_ENV,
  HTTP_PROXY: "",
  HTTPS_PROXY: "",
  ALL_PROXY: "",
  http_proxy: "",
  https_proxy: "",
  all_proxy: ""
}

/** 浅克隆。本机代理 127.0.0.1 不通时去掉代理再试一次。 */
export async function cloneGitSource(stateRoot: string, origin: string): Promise<ParsedGitOrigin> {
  const parsed = parseGitOrigin(origin)
  const parent = gitSourcesRoot(stateRoot)
  mkdirSync(parent, { recursive: true })
  const dest = gitCheckoutPath(stateRoot, parsed.sourceId)
  if (existsSync(dest)) removeGitCheckout(stateRoot, parsed.sourceId)
  const first = await runGitClone(parent, parsed.url, parsed.sourceId, false)
  if (first.exitCode === 0) return parsed
  if (!isGitProxyOrNetworkError(first.stderr)) throwIfGitFailed(first, "GIT_CLONE_FAILED")
  if (existsSync(dest)) removeGitCheckout(stateRoot, parsed.sourceId)
  const retry = await runGitClone(parent, parsed.url, parsed.sourceId, true)
  throwIfGitFailed(retry, "GIT_PROXY_UNREACHABLE")
  return parsed
}

/** 快进拉取已有 checkout。 */
export async function pullGitSource(stateRoot: string, sourceId: string): Promise<void> {
  const dest = gitCheckoutPath(stateRoot, sourceId)
  const first = await runGit(dest, ["pull", "--ff-only"], 120_000)
  if (first.exitCode === 0) return
  if (!isGitProxyOrNetworkError(first.stderr)) throwIfGitFailed(first, "GIT_PULL_FAILED")
  const retry = await runExecutable(
    dest,
    "git",
    ["-c", "http.proxy=", "-c", "https.proxy=", "pull", "--ff-only"],
    120_000,
    GIT_NO_PROXY_ENV
  )
  throwIfGitFailed(retry, "GIT_PROXY_UNREACHABLE")
}

export function isGitProxyOrNetworkError(stderr: string): boolean {
  return /Failed to connect|Could not connect to server|Connection refused|via 127\.0\.0\.1|Proxy CONNECT/i.test(
    stderr
  )
}

async function runGitClone(
  parent: string,
  url: string,
  destName: string,
  bypassProxy: boolean
): Promise<CommandResult> {
  const proxyFlags = bypassProxy ? ["-c", "http.proxy=", "-c", "https.proxy="] : []
  return runExecutable(
    parent,
    "git",
    ["-c", "credential.helper=", ...proxyFlags, "clone", "--depth", "1", url, destName],
    120_000,
    bypassProxy ? GIT_NO_PROXY_ENV : GIT_NO_PROMPT_ENV
  )
}

function isBlockedScheme(origin: string): boolean {
  return /^(git@|ssh:|http:|clawhub:)/i.test(origin)
}

function parseHttpsGitUrl(origin: string): ParsedGitOrigin {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new Error("UNSUPPORTED_SOURCE")
  }
  if (parsed.protocol !== "https:") throw new Error("UNSUPPORTED_SOURCE")
  const host = parsed.hostname.toLowerCase()
  if (!ALLOWED_HOSTS.has(host)) throw new Error("UNSUPPORTED_SOURCE")
  const segments = parsed.pathname
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
  if (segments.length < 2) throw new Error("UNSUPPORTED_SOURCE")
  const owner = segments[segments.length - 2]
  const repo = segments[segments.length - 1]
  return {
    url: `https://${host}/${segments.join("/")}.git`,
    sourceId: `${owner}-${repo}`.toLowerCase()
  }
}

function throwIfGitFailed(result: CommandResult, fallback: string): void {
  if (result.exitCode === 0) return
  if (isGitMissing(result.stderr)) throw new Error("GIT_NOT_FOUND")
  if (isGitProxyOrNetworkError(result.stderr)) throw new Error("GIT_PROXY_UNREACHABLE")
  throw new Error(result.stderr.trim() || fallback)
}

function isGitMissing(stderr: string): boolean {
  return /ENOENT/i.test(stderr) || /not recognized/i.test(stderr) || /不是内部或外部命令/.test(stderr)
}
