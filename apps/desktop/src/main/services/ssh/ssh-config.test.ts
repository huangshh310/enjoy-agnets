import assert from "node:assert/strict"
import { test } from "node:test"
import { isGitScmHost, parseSshConfig } from "./ssh-config.ts"

test("具体 Host 解析 User/Port/IdentityFile，忽略模式 Host", () => {
  const hosts = parseSshConfig(`
Host *
  User nobody
Host devbox build
  HostName dev.example.com
  User alice
  Port 2222
  IdentityFile ~/.ssh/id_ed25519
Host "lab"
  HostName lab.internal
`)
  assert.deepEqual(
    hosts.map((item) => item.alias),
    ["devbox", "build", "lab"]
  )
  assert.equal(hosts[0]?.host, "dev.example.com")
  assert.equal(hosts[0]?.user, "alice")
  assert.equal(hosts[0]?.port, 2222)
  assert.equal(hosts[0]?.identityFile, "~/.ssh/id_ed25519")
  assert.equal(hosts[1]?.alias, "build")
  assert.equal(hosts[1]?.host, "dev.example.com")
  assert.equal(hosts[2]?.host, "lab.internal")
})

test("无 HostName 时 host 回落别名；通配 Host 不产出", () => {
  const hosts = parseSshConfig(`
Host *.internal
  User ops
Host jump
  User root
`)
  assert.equal(hosts.length, 1)
  assert.equal(hosts[0]?.alias, "jump")
  assert.equal(hosts[0]?.host, "jump")
  assert.equal(hosts[0]?.user, "root")
})

test("git SCM 主机不当开发机", () => {
  assert.equal(isGitScmHost("github.com"), true)
  assert.equal(isGitScmHost("codeup.aliyun.com"), true)
  assert.equal(isGitScmHost("dev.corp.internal"), false)
})
