/**
 * luna #159：没配 git user.name / user.email 时「这一轮开始前」记录必须照样存下，
 * 还原能找到；用户仓库 config 不被写；失败带 stderr 记日志并返回 null。
 * 真 git 临时仓库，GIT_CONFIG_GLOBAL=/dev/null + GIT_CONFIG_NOSYSTEM=1，无任何身份。
 */
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test, type TestContext } from "node:test"
import { runGit } from "./command.ts"
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

test("无身份：记录存下、ref 存在、还原找得到、用户 config 不变", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    const configBefore = await readFile(join(root, ".git", "config"), "utf8")
    // 前置：确认环境真的没有身份，普通 commit-tree 会失败（否则本测试空跑）。
    const tree = (await runGit(root, ["write-tree"])).stdout.trim()
    const plain = await runGit(root, ["commit-tree", tree, "-m", "probe"])
    assert.notEqual(plain.exitCode, 0, "环境意外带了 git 身份")

    await writeFile(join(root, "note.txt"), "before\n", "utf8")
    const ref = await recordEnjoyCheckpoint(root, META)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
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
    await writeFile(join(root, "note.txt"), "x\n", "utf8")
    const ref = await recordEnjoyCheckpoint(root, META)
    assert.ok(ref?.startsWith("refs/enjoy/checkpoints/"), `ref=${ref}`)
  })
})

test("用户配了身份：内部记录仍用 Enjoy，不把用户身份写进隐藏 ref", async (t) => {
  await withNoIdentityRepo(t, async (root) => {
    await runGit(root, ["config", "user.name", "Real User"])
    await runGit(root, ["config", "user.email", "real@example.com"])
    const ref = await recordEnjoyCheckpoint(root, META)
    assert.ok(ref)
    const author = (await runGit(root, ["log", "-1", "--format=%an <%ae>", ref])).stdout.trim()
    assert.equal(author, "Enjoy <enjoy@local>")
  })
})

test("无 HEAD 的空仓库：无身份也能存下", async (t) => {
  await withNoIdentityRepo(
    t,
    async (root) => {
      await writeFile(join(root, "a.txt"), "a\n", "utf8")
      const ref = await recordEnjoyCheckpoint(root, META)
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

async function withNoIdentityRepo(
  t: TestContext,
  run: (root: string) => Promise<void>,
  opts: { seed?: boolean } = {}
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
