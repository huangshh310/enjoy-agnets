import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const dir = dirname(fileURLToPath(import.meta.url))

test("远程创建步走 openSsh，不调用本机 pickFolder", () => {
  const remote = readFileSync(join(dir, "create-project-remote-step.tsx"), "utf8")
  const hook = readFileSync(join(dir, "use-create-project-remote.ts"), "utf8")
  const dialog = readFileSync(join(dir, "create-project-dialog.tsx"), "utf8")
  const typeStep = readFileSync(join(dir, "create-project-type-step.tsx"), "utf8")
  assert.equal(remote.includes("pickFolder"), false)
  assert.equal(hook.includes("pickFolder"), false)
  assert.match(hook, /sshProbe/)
  assert.match(hook, /sshBrowse/)
  assert.match(hook, /password: upsert\.password/)
  assert.match(remote, /showSelectedPassword \? "text" : "password"/)
  assert.match(remote, /RiEyeLine/)
  assert.match(dialog, /workspace\.openSsh/)
  assert.match(typeStep, /onChangeType\("remote"\)/)
  assert.equal(typeStep.includes("comingSoon"), false)
})
