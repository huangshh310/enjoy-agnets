import assert from "node:assert/strict"
import { test } from "node:test"
import { sshClientArgs, usesPasswordAskpass } from "./ssh-argv.ts"
import { mapSshFailure } from "./ssh-listing.ts"

test("新主机 argv 带 accept-new；密钥仍 BatchMode", () => {
  const args = sshClientArgs(
    { host: "152.32.225.119", user: "ubuntu", port: 22, auth: "agent" },
    "true"
  )
  assert.ok(args.includes("StrictHostKeyChecking=accept-new"))
  assert.ok(args.includes("BatchMode=yes"))
  assert.ok(args.includes("ubuntu@152.32.225.119"))
  assert.equal(usesPasswordAskpass("agent"), false)
})

test("密码登录不 BatchMode，也不把密码放进 argv", () => {
  const args = sshClientArgs(
    { host: "152.32.225.119", user: "ubuntu", port: 22, auth: "password" },
    "true"
  )
  assert.ok(args.includes("StrictHostKeyChecking=accept-new"))
  assert.equal(args.includes("BatchMode=yes"), false)
  assert.ok(args.includes("PreferredAuthentications=keyboard-interactive,password"))
  assert.equal(args.some((part) => part.includes("secret")), false)
  assert.equal(usesPasswordAskpass("password"), true)
})

test("host key 失败映射人话，不把用户赶到终端", () => {
  const error = mapSshFailure({
    stdout: "",
    stderr: "Host key verification failed.\n",
    exitCode: 255
  })
  assert.match(error.message, /主机指纹/)
  const denied = mapSshFailure({
    stdout: "",
    stderr: "Permission denied (password).\n",
    exitCode: 255
  })
  assert.match(denied.message, /密码或密钥/)
})
