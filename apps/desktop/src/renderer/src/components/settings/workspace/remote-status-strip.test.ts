import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { parseRemoteLabel } from "./parse-remote-label.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("parseRemoteLabel: 解析标准 user@host:/path 格式", () => {
  const parsed = parseRemoteLabel("ubuntu@152.32.225.119:/home/ubuntu/workspace")
  assert.equal(parsed.endpoint, "ubuntu@152.32.225.119")
  assert.equal(parsed.path, "/home/ubuntu/workspace")
})

test("parseRemoteLabel: 解析带端口的 host:port:/path 格式", () => {
  const parsed = parseRemoteLabel("152.32.225.119:2222:/var/www/app")
  assert.equal(parsed.endpoint, "152.32.225.119:2222")
  assert.equal(parsed.path, "/var/www/app")
})

test("parseRemoteLabel: 解析仅主机与仅路径等边界情况", () => {
  const onlyHost = parseRemoteLabel("ubuntu@152.32.225.119")
  assert.equal(onlyHost.endpoint, "ubuntu@152.32.225.119")
  assert.equal(onlyHost.path, "")

  const onlyPath = parseRemoteLabel("/home/ubuntu/project")
  assert.equal(onlyPath.endpoint, "")
  assert.equal(onlyPath.path, "/home/ubuntu/project")

  const empty = parseRemoteLabel(null)
  assert.equal(empty.endpoint, "")
  assert.equal(empty.path, "")
})

test("RemoteStatusStrip 与 RemoteHostSwitcher 结构不变量验证", () => {
  const stripCode = readFileSync(join(dir, "remote-status-strip.tsx"), "utf8")
  const switcherCode = readFileSync(join(dir, "remote-host-switcher.tsx"), "utf8")

  // 顶条必须挂载 RemoteHostSwitcher 与路径胶囊
  assert.match(stripCode, /<RemoteHostSwitcher/)
  assert.match(stripCode, /parseRemoteLabel/)
  assert.match(stripCode, /handleCopyPath/)
  assert.match(stripCode, /remoteEnvBadge/)
  assert.match(stripCode, /remoteEnvTooltip/)

  // 切换面板必须具备主机查询与工作区切换逻辑
  assert.match(switcherCode, /workspace\.sshHosts\.list/)
  assert.match(switcherCode, /loadWorkspace/)
  assert.match(switcherCode, /remoteHostsTitle/)
  assert.match(switcherCode, /remoteActiveHost/)
  assert.match(switcherCode, /remoteOtherHosts/)
})
