/**
 * FE-P：xterm 5.x addon 精确钉版本，禁止 6 系与 ^/~。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, "../../../../../..")
const EXPECTED = {
  "@xterm/addon-webgl": "0.18.0",
  "@xterm/addon-search": "0.15.0",
  "@xterm/addon-web-links": "0.11.0",
  "@xterm/addon-unicode11": "0.8.0"
} as const

test("catalog 与 desktop 精确钉 5.x addon，无 ^/~", () => {
  const yaml = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8")
  const pkg = JSON.parse(readFileSync(join(root, "apps/desktop/package.json"), "utf8")) as {
    dependencies: Record<string, string>
  }
  for (const [name, version] of Object.entries(EXPECTED)) {
    assert.match(yaml, new RegExp(`${escapeReg(name)}": "${version}"`))
    assert.doesNotMatch(yaml, new RegExp(`${escapeReg(name)}": [\\^~]`))
    assert.equal(pkg.dependencies[name], "catalog:")
  }
  assert.match(yaml, /"@xterm\/xterm": \^5\./)
  assert.doesNotMatch(yaml, /"@xterm\/xterm": \^6/)
  assert.doesNotMatch(yaml, /"@xterm\/addon-webgl": "0\.19/)
})

test("已装 addon 的 peer 认 xterm 5", () => {
  for (const name of Object.keys(EXPECTED)) {
    const peer = readPeer(join(root, "apps/desktop/node_modules", name, "package.json"))
    assert.ok(peer, `missing peer for ${name}`)
    assert.match(peer, /\^5/)
    assert.doesNotMatch(peer, /\^6/)
  }
})

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function readPeer(pkgPath: string): string {
  const json = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    peerDependencies?: { "@xterm/xterm"?: string }
  }
  return json.peerDependencies?.["@xterm/xterm"] ?? ""
}
