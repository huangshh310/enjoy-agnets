/**
 * P2 切片①：开拉取请求探针 / authStatus / 确认后 create / 同仓 list（attach-only）。
 * create 只走本文件 main 适配层调 `gh`；禁 renderer 持 token；E2E stub 防污染远端。
 */
import type {
  AttachedPrItem,
  WorkspacePrCreateResult,
  WorkspacePrProbeResult
} from "@enjoy-agents/ipc-contract"
import { runExecutable, runGit } from "./command"
import { detectGitRepo } from "./workspace-git-repo"
import { readUpstream } from "./workspace-git-remote"

export type GithubAuthStatus = {
  authed: boolean
  login?: string
  stub?: boolean
}

function stubProbeOverride(): WorkspacePrProbeResult["reason"] | null {
  const raw = process.env.ENJOY_E2E_PR_PROBE?.trim()
  if (!raw) return null
  if (
    raw === "ok" ||
    raw === "not-git" ||
    raw === "no-upstream" ||
    raw === "no-commits" ||
    raw === "not-authed" ||
    raw === "ssh-unsupported"
  ) {
    return raw
  }
  return null
}

function prStubEnabled(): boolean {
  return process.env.ENJOY_E2E_PR_STUB === "1"
}

/** 显式 authStatus（Must#5）：只读；禁冒充 Releases/MCP/OMP device。 */
export async function readGithubAuthStatus(cwd = process.cwd()): Promise<GithubAuthStatus> {
  if (process.env.ENJOY_E2E_PR_PROBE === "not-authed") {
    return { authed: false, stub: true }
  }
  if (prStubEnabled()) {
    return { authed: true, login: "e2e-stub", stub: true }
  }
  const res = await runExecutable(cwd, "gh", ["auth", "status"], 15_000)
  if (res.exitCode !== 0) return { authed: false }
  const loginMatch = (res.stdout + "\n" + res.stderr).match(/Logged in to github\.com account (\S+)/i)
  return { authed: true, login: loginMatch?.[1] }
}

async function aheadCount(cwd: string, upstream: string): Promise<number> {
  if (!upstream) return 0
  const res = await runGit(cwd, ["rev-list", "--count", `${upstream}..HEAD`])
  if (res.exitCode !== 0) return 0
  const n = Number(res.stdout.trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

async function draftFromGit(cwd: string, branch: string): Promise<{ title: string; body: string }> {
  const log = await runGit(cwd, ["log", "-1", "--pretty=%s"])
  const subject = log.exitCode === 0 ? log.stdout.trim() : ""
  const title = subject || (branch ? `Update ${branch}` : "Pull request")
  const body = [
    "## 摘要",
    "",
    "（助手草稿 · 请确认后开 PR）",
    "",
    `分支：\`${branch || "?"}\``
  ].join("\n")
  return { title, body }
}

async function existingPr(cwd: string): Promise<{ number: number; url: string } | null> {
  if (prStubEnabled()) return null
  const json = await runExecutable(cwd, "gh", ["pr", "view", "--json", "number,url"], 15_000)
  if (json.exitCode !== 0) return null
  try {
    const parsed = JSON.parse(json.stdout) as { number?: number; url?: string }
    if (typeof parsed.number === "number" && parsed.number > 0 && parsed.url) {
      return { number: parsed.number, url: parsed.url }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** 从 origin URL 解析 owner/repo，供 attach 同仓校验。 */
export async function readOriginOwnerRepo(cwd: string): Promise<{ owner: string; repo: string } | null> {
  const res = await runGit(cwd, ["remote", "get-url", "origin"])
  if (res.exitCode !== 0) return null
  const url = res.stdout.trim()
  const https = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i)
  if (https) return { owner: https[1]!, repo: https[2]! }
  return null
}

export async function probeWorkspacePr(workspaceRoot: string): Promise<WorkspacePrProbeResult> {
  const forced = stubProbeOverride()
  if (forced && forced !== "ok") {
    return {
      reason: forced,
      branch: "",
      upstream: "",
      aheadCount: 0,
      draftTitle: "",
      draftBody: "",
      authStatus: forced === "not-authed" ? "logged-out" : "unknown",
      stub: true
    }
  }

  const isGit = await detectGitRepo(workspaceRoot)
  if (!isGit) {
    return {
      reason: "not-git",
      branch: "",
      upstream: "",
      aheadCount: 0,
      draftTitle: "",
      draftBody: "",
      authStatus: "unknown"
    }
  }

  const branchRes = await runGit(workspaceRoot, ["rev-parse", "--abbrev-ref", "HEAD"])
  const branch = branchRes.exitCode === 0 ? branchRes.stdout.trim() : ""
  const upstream = await readUpstream(workspaceRoot)
  if (!upstream) {
    return {
      reason: "no-upstream",
      branch,
      upstream: "",
      aheadCount: 0,
      draftTitle: "",
      draftBody: "",
      authStatus: "unknown",
      stub: prStubEnabled() || undefined
    }
  }

  const ahead = await aheadCount(workspaceRoot, upstream)
  if (ahead === 0 && forced !== "ok") {
    return {
      reason: "no-commits",
      branch,
      upstream,
      aheadCount: 0,
      draftTitle: "",
      draftBody: "",
      authStatus: "unknown",
      stub: prStubEnabled() || undefined
    }
  }

  const auth = await readGithubAuthStatus(workspaceRoot)
  if (!auth.authed) {
    return {
      reason: "not-authed",
      branch,
      upstream,
      aheadCount: ahead,
      draftTitle: "",
      draftBody: "",
      authStatus: "logged-out",
      stub: prStubEnabled() || undefined
    }
  }

  const draft = await draftFromGit(workspaceRoot, branch)
  const existing = await existingPr(workspaceRoot)
  return {
    reason: "ok",
    branch,
    upstream,
    aheadCount: forced === "ok" ? Math.max(ahead, 1) : ahead,
    draftTitle: draft.title,
    draftBody: draft.body,
    existingPrNumber: existing?.number,
    existingPrUrl: existing?.url,
    authStatus: "logged-in",
    authLogin: auth.login,
    stub: prStubEnabled() || undefined
  }
}

export async function createWorkspacePr(
  workspaceRoot: string,
  title: string,
  body: string
): Promise<WorkspacePrCreateResult> {
  const probe = await probeWorkspacePr(workspaceRoot)
  if (probe.reason !== "ok") {
    return {
      ok: false,
      reason: probe.reason === "ssh-unsupported" ? "ssh-unsupported" : probe.reason,
      message: probe.reason
    }
  }

  if (prStubEnabled()) {
    const number = 4242
    return {
      ok: true,
      number,
      url: `https://github.com/example/enjoy-stub/pull/${number}`,
      title,
      stub: true
    }
  }

  const args = ["pr", "create", "--title", title, "--body", body || "", "--json", "number,url,title"]
  const res = await runExecutable(workspaceRoot, "gh", args, 60_000)
  if (res.exitCode !== 0) {
    const detail = (res.stderr || res.stdout || "gh pr create failed").trim()
    return { ok: false, reason: "create-failed", message: detail.slice(0, 800) }
  }
  try {
    const parsed = JSON.parse(res.stdout) as { number?: number; url?: string; title?: string }
    if (typeof parsed.number === "number" && parsed.number > 0 && parsed.url) {
      return {
        ok: true,
        number: parsed.number,
        url: parsed.url,
        title: parsed.title || title
      }
    }
  } catch {
    /* fall through */
  }
  return {
    ok: false,
    reason: "create-failed",
    message: (res.stdout || res.stderr || "unexpected gh output").trim().slice(0, 800)
  }
}

/** attach-only discovery：同仓 open PR 列表；禁夹带 create。 */
export async function listWorkspacePullRequests(workspaceRoot: string): Promise<{
  ok: boolean
  items: AttachedPrItem[]
  message?: string
}> {
  if (prStubEnabled()) {
    return {
      ok: true,
      items: [
        {
          number: 12,
          url: "https://github.com/example/enjoy-stub/pull/12",
          title: "feat: stub login split"
        },
        {
          number: 15,
          url: "https://github.com/example/enjoy-stub/pull/15",
          title: "fix: stub empty state"
        }
      ]
    }
  }

  const auth = await readGithubAuthStatus(workspaceRoot)
  if (!auth.authed) return { ok: false, items: [], message: "not-authed" }

  const origin = await readOriginOwnerRepo(workspaceRoot)
  if (!origin) return { ok: false, items: [], message: "no-origin" }

  const res = await runExecutable(
    workspaceRoot,
    "gh",
    [
      "pr",
      "list",
      "--repo",
      `${origin.owner}/${origin.repo}`,
      "--state",
      "open",
      "--limit",
      "30",
      "--json",
      "number,url,title"
    ],
    30_000
  )
  if (res.exitCode !== 0) {
    return { ok: false, items: [], message: (res.stderr || res.stdout || "list failed").trim().slice(0, 400) }
  }
  try {
    const parsed = JSON.parse(res.stdout) as Array<{ number?: number; url?: string; title?: string }>
    const items: AttachedPrItem[] = []
    for (const row of parsed) {
      if (typeof row.number !== "number" || row.number <= 0 || !row.url) continue
      if (!prUrlMatchesRepo(row.url, origin.owner, origin.repo)) continue
      items.push({ number: row.number, url: row.url, title: row.title || "" })
    }
    return { ok: true, items }
  } catch {
    return { ok: false, items: [], message: "bad list json" }
  }
}

/** 校验 PR URL 是否同仓（Must#4）。 */
export function prUrlMatchesRepo(url: string, owner: string, repo: string): boolean {
  const re = new RegExp(`github\\.com[/:]${escapeRe(owner)}/${escapeRe(repo)}(?:\\.git)?/(?:pull|issues)/\\d+`, "i")
  // also accept https://github.com/owner/repo/pull/n
  const plain = new RegExp(`github\\.com/${escapeRe(owner)}/${escapeRe(repo)}/pull/\\d+`, "i")
  return plain.test(url) || re.test(url)
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
