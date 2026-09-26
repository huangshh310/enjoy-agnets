import assert from "node:assert/strict"
import { test } from "node:test"
import { homedir } from "node:os"
import { filteredStdioEnv, stdioSpawnCwd } from "./stdio-spawn.ts"

test("剥离 NODE_OPTIONS 与 ELECTRON_RUN_AS_NODE，含 UI 覆盖", () => {
  const previousNode = process.env.NODE_OPTIONS
  const previousElectron = process.env.ELECTRON_RUN_AS_NODE
  process.env.NODE_OPTIONS = "--require ./evil.js"
  process.env.ELECTRON_RUN_AS_NODE = "1"
  try {
    const env = filteredStdioEnv({
      NODE_OPTIONS: "--inspect",
      ELECTRON_RUN_AS_NODE: "1",
      API_TOKEN: "secret"
    })
    assert.equal(env.NODE_OPTIONS, undefined)
    assert.equal(env.ELECTRON_RUN_AS_NODE, undefined)
    assert.equal(env.API_TOKEN, "secret")
  } finally {
    if (previousNode == null) delete process.env.NODE_OPTIONS
    else process.env.NODE_OPTIONS = previousNode
    if (previousElectron == null) delete process.env.ELECTRON_RUN_AS_NODE
    else process.env.ELECTRON_RUN_AS_NODE = previousElectron
  }
})

test("stdio cwd 是家目录，不跟 process.cwd", () => {
  assert.equal(stdioSpawnCwd(), homedir())
})
