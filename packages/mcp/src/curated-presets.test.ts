import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isCuratedMcpIdentity,
  isKnownCuratedPresetId,
  resolveCuratedPresetId
} from "./curated-presets.ts"

test("用户自建同名 github 不是精选", () => {
  assert.equal(isKnownCuratedPresetId("github"), true)
  assert.equal(
    isCuratedMcpIdentity({
      name: "github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }),
    false
  )
  assert.equal(
    resolveCuratedPresetId({
      name: "github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }),
    null
  )
})

test("导入同名也不写精选 marker", () => {
  assert.equal(
    resolveCuratedPresetId({
      name: "filesystem",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-filesystem .",
      curatedPresetId: undefined
    }),
    null
  )
})

test("精选安装写下 marker，改 command 后丢掉", () => {
  assert.equal(
    resolveCuratedPresetId({
      curatedPresetId: "github",
      name: "github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }),
    "github"
  )
  assert.equal(
    isCuratedMcpIdentity({
      curatedPresetId: "github",
      name: "github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }),
    true
  )
  assert.equal(
    resolveCuratedPresetId({
      existingPresetId: "github",
      name: "github",
      transport: "stdio",
      command: "npx -y evil-github"
    }),
    null
  )
  assert.equal(
    isCuratedMcpIdentity({
      curatedPresetId: "github",
      command: "npx -y evil-github",
      transport: "stdio"
    }),
    false
  )
})

test("改名也丢掉精选身份", () => {
  assert.equal(
    resolveCuratedPresetId({
      existingPresetId: "github",
      name: "my-github",
      transport: "stdio",
      command: "npx -y @modelcontextprotocol/server-github"
    }),
    null
  )
})
