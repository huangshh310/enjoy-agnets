import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpSpawnFailure, planAcpSshSpawn, toAcpSpawnDirect } from "./acp-ssh-spawn.ts"

const allowed = ["claude", "codex", "cursor"]

test("远端 ACP spawn 用 catalog basename 与远端 cwd，失败人话含远端未找到", () => {
  const plan = planAcpSshSpawn({
    kind: "ssh",
    catalogBasename: "claude",
    allowedBasenames: allowed,
    acpArgs: ["acp", "--model", "opus"],
    ssh: {
      user: "alice",
      host: "dev.internal",
      port: 22,
      remotePath: "/home/alice/app"
    }
  })
  assert.equal(plan.mode, "ssh")
  // Windows 本机客户端是 OpenSSH ssh.exe，不是 PATH 上的裸 ssh。
  assert.ok(plan.command === "ssh" || plan.command.endsWith("ssh.exe"))
  assert.ok(plan.args.includes("alice@dev.internal"))
  assert.ok(plan.args.some((arg) => arg.includes("/home/alice/app")))
  assert.ok(plan.args.some((arg) => arg.includes("claude")))
  assert.equal(
    plan.args.some((arg) => arg.includes("/Users/") && arg.endsWith("claude")),
    false
  )
  assert.ok(plan.failHint.includes("远端未找到"))
  assert.equal(plan.handshakeCwd, "/home/alice/app")
  assert.notEqual(plan.cwd, "alice@dev.internal:/home/alice/app")
  const direct = toAcpSpawnDirect(plan)
  assert.equal(direct.cwd, plan.cwd)
  assert.equal(direct.handshakeCwd, plan.handshakeCwd)
  assert.equal(direct.failHint, plan.failHint)
  assert.equal(mapAcpSpawnFailure(new Error("spawn ssh ENOENT"), plan.failHint).message, plan.failHint)
})

test("WSL 远端 ACP 走 wsl.exe -d 发行版，不必 sshd", () => {
  const plan = planAcpSshSpawn({
    kind: "ssh",
    catalogBasename: "claude",
    allowedBasenames: allowed,
    acpArgs: ["acp"],
    ssh: {
      user: "wsl",
      host: "Ubuntu",
      port: 22,
      remotePath: "/home/alice/app",
      transport: "wsl"
    }
  })
  assert.ok(plan.command.endsWith("wsl") || plan.command.endsWith("wsl.exe"))
  assert.ok(plan.args.includes("-d"))
  assert.ok(plan.args.includes("Ubuntu"))
  assert.equal(plan.args.includes("wsl@Ubuntu"), false)
  assert.equal(plan.handshakeCwd, "/home/alice/app")
})

test("resolveAcpSpawnDirect 把 transport 传给 spawn 计划", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./resolve-acp-spawn.ts", import.meta.url), "utf8")
  assert.match(src, /transport: spec\.transport/)
  assert.match(src, /sshSpecFromRecord/)
  assert.match(src, /assertSshPoolConnected/)
})

test("本机 argv 不是远端 CLI 的假本地路径", () => {
  const plan = planAcpSshSpawn({
    kind: "local",
    catalogBasename: "claude",
    allowedBasenames: allowed,
    acpArgs: ["acp"],
    localCommand: "claude",
    localArgs: ["acp"],
    localCwd: "/tmp/repo"
  })
  assert.equal(plan.mode, "local")
  assert.equal(plan.command, "claude")
  assert.deepEqual(plan.args, ["acp"])
  assert.equal(plan.cwd, "/tmp/repo")
})
