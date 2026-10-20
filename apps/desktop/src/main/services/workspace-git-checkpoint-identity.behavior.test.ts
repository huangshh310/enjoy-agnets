/**
 * luna #159：没配 git user.name / user.email 时「这一轮开始前」记录必须照样存下，
 * 还原能找到；用户仓库 config 不被写；失败带 stderr 记日志并返回 null。
 * 真 git 临时仓库，GIT_CONFIG_GLOBAL=/dev/null + GIT_CONFIG_NOSYSTEM=1，无任何身份。
 * 身份只能落在那一次 commit-tree 上：记账前后 process.env 逐键相同，用户自己的提交前后表现相同。
 */
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test, type TestContext } from "node:test"
import { runGit } from "./command.ts"
import { resetCheckpointFailureLog } from "./workspace-git-checkpoint-log.ts"
import { restoreEnjoyCheckpoint } from "./workspace-git-checkpoint-restore.ts"
import { listEnjoyCheckpointItems, recordEnjoyCheckpoint } from "./workspace-git-checkpoint.ts"

const ISOLATE: Record<string, string> = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1"
}
const IDENTITY_KEYS = [
  "GIT_AUTHOR_NAME",
  "GIT_AUTHOR_EMAIL",
  "GIT_COMMITTER_NAME",
  "GIT_COMMITTER_EMAIL",
  "EMAIL"
]
const META = { sessionId: "s1", runId: "r1", kind: "baseline" as const }
const ALICE: Record<string, string> = {
  GIT_AUTHOR_NAME: "Alice",
  GIT_AUTHOR_EMAIL: "alice@example.com",
  GIT_COMMITTER_NAME: "Alice",
  GIT_COMMITTER_EMAIL: "alice@example.com"
}

test("无身份：记录存下、ref 存在、还原找得到、用户 config 不变", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    const configBefore = await readFile(join(root, ".git", "config"), "utf8")
    // 前置探针：Linux / Windows CI 上普通 commit-tree 会失败；macOS 能从主机名猜出邮箱会成功，
    // 那里「无身份必失败」由下一条 useConfigOnly 用例兜底，这里只记诊断。
    if (await plainCommitTreeSucceeds(root)) t.diagnostic("host git auto-detects an identity")

    await writeFile(join(root, "note.txt"), "before\n", "utf8")
    const userBefore = await userCommitIdent(root)
    const ref = await recordWithEnvUnchanged(root)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
    // 用户自己的提交不受影响：没身份照样失败（macOS 照样是主机猜出的那个身份），绝不变成 Enjoy。
    assert.deepEqual(await userCommitIdent(root), userBefore)
    assert.equal((await runGit(root, ["show-ref", "--verify", ref])).exitCode, 0)
    const author = (await runGit(root, ["log", "-1", "--format=%an <%ae>|%cn <%ce>", ref])).stdout.trim()
    assert.equal(author, "Enjoy <enjoy@local>|Enjoy <enjoy@local>")

    const items = await listEnjoyCheckpointItems(root)
    const found = items.find((item) => item.ref === ref)
    assert.equal(found?.kind, "baseline")
    assert.equal(found?.sessionId, "s1")

    await writeFile(join(root, "note.txt"), "after\n", "utf8")
    const restored = await restoreEnjoyCheckpoint(root, ref)
    assert.equal(restored.ok, true)
    assert.equal(await readFile(join(root, "note.txt"), "utf8"), "before\n")

    assert.equal(await readFile(join(root, ".git", "config"), "utf8"), configBefore)
    assert.notEqual((await runGit(root, ["config", "--get", "user.name"])).exitCode, 0)
    assert.notEqual((await runGit(root, ["config", "--get", "user.email"])).exitCode, 0)
  })
})

test("user.useConfigOnly=true 且 HOME 无全局配置：仍能存下", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    assert.equal((await runGit(root, ["config", "user.useConfigOnly", "true"])).exitCode, 0)
    // 各平台都不许猜身份 → 普通 commit-tree 必失败，证明本用例确实是「无身份」。
    assert.equal(await plainCommitTreeSucceeds(root), false, "环境意外带了 git 身份")
    await writeFile(join(root, "note.txt"), "x\n", "utf8")
    const ref = await recordWithEnvUnchanged(root)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
    // 各平台：记完之后用户自己的 git commit 仍因无身份失败（身份没漏进进程环境）。
    const userCommit = await runGit(root, ["commit", "--allow-empty", "-qm", "user"])
    assert.notEqual(userCommit.exitCode, 0, "Enjoy 身份漏给了用户自己的提交")
  })
})

test("用户配了身份（config + GIT_AUTHOR_*/GIT_COMMITTER_* env）：隐藏 ref 仍是 Enjoy，用户提交仍是用户", async (t) => {
  await withNoIdentityRepo(
    t,
    async (root) => {
      await runGit(root, ["config", "user.name", "Real User"])
      await runGit(root, ["config", "user.email", "real@example.com"])
      const ref = await recordWithEnvUnchanged(root)
      assert.ok(ref)
      const ident = (await runGit(root, ["log", "-1", "--format=%an <%ae>|%cn <%ce>", ref])).stdout.trim()
      assert.equal(ident, "Enjoy <enjoy@local>|Enjoy <enjoy@local>")
      // 用户自己的提交：env 里的 Alice 胜过 config，且不被 Enjoy 盖掉。
      assert.equal((await runGit(root, ["commit", "--allow-empty", "-qm", "user"])).exitCode, 0)
      const user = (await runGit(root, ["log", "-1", "--format=%an <%ae>|%cn <%ce>", "HEAD"])).stdout.trim()
      assert.equal(user, "Alice <alice@example.com>|Alice <alice@example.com>")
    },
    { env: ALICE }
  )
})

test("无 HEAD 的空仓库：无身份也能存下", async (t) => {
  await withNoIdentityRepo(
    t,
    async (root) => {
      await writeFile(join(root, "a.txt"), "a\n", "utf8")
      const ref = await recordWithEnvUnchanged(root)
      assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
    },
    { seed: false }
  )
})

test("保存失败：带 git stderr 记日志并返回 null，不建 ref", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    await writeFile(join(root, "note.txt"), "x\n", "utf8")
    // 让 commit-tree 的 -p HEAD 指向坏对象 → git 必失败（与身份无关的真实 git 错误）。
    const head = (await runGit(root, ["rev-parse", "HEAD"])).stdout.trim()
    await rm(join(root, ".git", "objects", head.slice(0, 2), head.slice(2)), { force: true })
    const errors: unknown[][] = []
    t.mock.method(console, "error", (...args: unknown[]) => {
      errors.push(args)
    })
    const ref = await recordEnjoyCheckpoint(root, META)
    assert.equal(ref, null)
    assert.equal(errors.length, 1, "失败必须记一条日志")
    const [label, detail] = errors[0] as [string, { step: string; stderr: string; runId?: string }]
    assert.equal(label, "[checkpoint] record failed")
    assert.ok(detail.stderr.length > 0, "日志必须带 git stderr")
    assert.equal(detail.runId, "r1")
    assert.equal((await runGit(root, ["for-each-ref", "refs/enjoy/checkpoints"])).stdout.trim(), "")
  })
})

test("commit.gpgSign=true（gpg 不可用）：内部记录不签名，照样存下", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    await runGit(root, ["config", "commit.gpgSign", "true"])
    await runGit(root, ["config", "gpg.program", "enjoy-no-such-gpg"])
    // git ≥ 2.9 的 commit-tree 本身不读 commit.gpgSign；--no-gpg-sign 防的是老 git。这里守住「照样存下且不签名」。
    await writeFile(join(root, "note.txt"), "x\n", "utf8")
    const ref = await recordWithEnvUnchanged(root)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
    const raw = (await runGit(root, ["cat-file", "commit", ref])).stdout
    assert.ok(!raw.includes("gpgsig"))
  })
})

test("同一工作区同一步骤短时间内重复失败：只记一条日志", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    await writeFile(join(root, ".git", "refs", "enjoy"), "blocker\n", "utf8")
    const errors: unknown[][] = []
    t.mock.method(console, "error", (...args: unknown[]) => {
      errors.push(args)
    })
    assert.equal(await recordEnjoyCheckpoint(root, META), null)
    assert.equal(await recordEnjoyCheckpoint(root, META), null)
    assert.equal(errors.length, 1, "同一工作区同一步骤 60s 内只记一次")
  })
})

test("update-ref 失败：同样带 stderr 记日志并返回 null", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    await writeFile(join(root, "note.txt"), "x\n", "utf8")
    // refs/enjoy 被占成普通文件 → update-ref 建不了 refs/enjoy/checkpoints/<stamp>。
    await writeFile(join(root, ".git", "refs", "enjoy"), "blocker\n", "utf8")
    const errors: unknown[][] = []
    t.mock.method(console, "error", (...args: unknown[]) => {
      errors.push(args)
    })
    assert.equal(await recordEnjoyCheckpoint(root, META), null)
    assert.equal(errors.length, 1, "失败必须记一条日志")
    const detail = errors[0]?.[1] as { step: string; stderr: string }
    assert.equal(detail.step, "update-ref")
    assert.ok(detail.stderr.length > 0, "日志必须带 git stderr")
  })
})

/** 记账前后各拍一次 process.env，中间不重置——身份泄漏到进程环境必然可见。 */
async function recordWithEnvUnchanged(root: string): Promise<string | null> {
  const before = { ...process.env }
  const ref = await recordEnjoyCheckpoint(root, META)
  assert.deepEqual({ ...process.env }, before, "记账改了 process.env")
  return ref
}

/** 用户自己提交（继承进程环境）的结果：退出码 + 作者/提交者。 */
async function userCommitIdent(root: string): Promise<{ exitCode: number; ident: string }> {
  const tree = (await runGit(root, ["write-tree"])).stdout.trim()
  const made = await runGit(root, ["commit-tree", tree, "-m", "user"])
  const sha = made.stdout.trim()
  if (made.exitCode !== 0 || !sha) return { exitCode: made.exitCode, ident: "" }
  const ident = (await runGit(root, ["log", "-1", "--format=%an <%ae>|%cn <%ce>", sha])).stdout.trim()
  return { exitCode: 0, ident }
}

async function plainCommitTreeSucceeds(root: string): Promise<boolean> {
  const tree = (await runGit(root, ["write-tree"])).stdout.trim()
  return (await runGit(root, ["commit-tree", tree, "-m", "probe"])).exitCode === 0
}

async function withNoIdentityRepo(
  t: TestContext,
  run: (root: string) => Promise<void>,
  opts: { seed?: boolean; env?: Record<string, string> } = {}
): Promise<void> {
  const parent = join(process.cwd(), "apps/desktop/test-results")
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, "ckpt-ident-"))
  const home = join(root, ".home")
  await mkdir(home)
  const saved = new Map<string, string | undefined>()
  const set = (key: string, value: string | undefined) => {
    if (!saved.has(key)) saved.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  for (const [key, value] of Object.entries(ISOLATE)) set(key, value)
  for (const key of IDENTITY_KEYS) set(key, undefined)
  set("HOME", home)
  set("XDG_CONFIG_HOME", join(home, ".config"))
  for (const [key, value] of Object.entries(opts.env ?? {})) set(key, value)
  resetCheckpointFailureLog()
  t.after(async () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await rm(root, { recursive: true, force: true })
  })
  const ws = join(root, "ws")
  await mkdir(ws)
  assert.equal((await runGit(ws, ["init", "-q", "-b", "main"])).exitCode, 0)
  await runGit(ws, ["config", "core.autocrlf", "false"])
  if (opts.seed !== false) {
    await writeFile(join(ws, "seed.txt"), "seed\n", "utf8")
    assert.equal((await runGit(ws, ["add", "seed.txt"])).exitCode, 0)
    const seeded = await runGit(ws, [
      "-c",
      "user.name=Seed",
      "-c",
      "user.email=seed@test",
      "commit",
      "-qm",
      "seed"
    ])
    assert.equal(seeded.exitCode, 0, seeded.stderr)
  }
  await run(ws)
}
