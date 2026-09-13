import assert from "node:assert/strict"
import { test } from "node:test"
import { browseSsh, normalizeBrowsePath, resetSshBrowseFactory, setSshBrowseFactory } from "./ssh-browse.ts"
import type { SshConnectionLayer } from "./ssh.types.ts"

test("normalizeBrowsePath 展开 ~ 并拒绝相对路径", () => {
  assert.equal(normalizeBrowsePath(undefined, "/home/alice"), "/home/alice")
  assert.equal(normalizeBrowsePath("~/work", "/home/alice"), "/home/alice/work")
  assert.equal(normalizeBrowsePath("/tmp/../app", "/home/alice"), "/app")
  assert.throws(() => normalizeBrowsePath("work", "/home/alice"))
})

test("browseSsh 走注入层，目录在前", async () => {
  setSshBrowseFactory(async () => {
    const layer: SshConnectionLayer = {
      status: "connected",
      ping: async () => "ok",
      exec: async () => ({ stdout: "/home/alice", stderr: "", exitCode: 0 }),
      readFile: async () => "",
      writeFile: async () => undefined,
      listDir: async () => [
        { name: "readme.md", kind: "file" },
        { name: "app", kind: "directory" }
      ],
      dispose: () => undefined
    }
    return layer
  })
  try {
    const listed = await browseSsh({ host: "dev", user: "alice", port: 22, auth: "agent" })
    assert.equal(listed.path, "/home/alice")
    assert.equal(listed.home, "/home/alice")
    assert.equal(listed.parent, "/home")
    assert.equal(listed.entries[0]?.kind, "directory")
    assert.equal(listed.entries[0]?.name, "app")
  } finally {
    resetSshBrowseFactory()
  }
})
