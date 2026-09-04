/**
 * Git 来源解析：只接受 owner/repo 简写与 GitHub/GitLab HTTPS。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { isGitProxyOrNetworkError, parseGitOrigin } from "./source-git.ts"

test("parseGitOrigin 将 owner/repo 展开为 github HTTPS", () => {
  const parsed = parseGitOrigin("garrytan/gstack")
  assert.equal(parsed.url, "https://github.com/garrytan/gstack.git")
  assert.equal(parsed.sourceId, "garrytan-gstack")
})

test("parseGitOrigin 拒绝 SSH git@ 来源", () => {
  assert.throws(() => parseGitOrigin("git@github.com:x/y.git"), /UNSUPPORTED_SOURCE/)
})

test("isGitProxyOrNetworkError 识别本机代理连不上 GitHub", () => {
  const stderr =
    "Cloning into 'mattpocock-skills'... fatal: unable to access 'https://github.com/mattpocock/skills/': Failed to connect to github.com port 443 via 127.0.0.1 after 2117 ms: Could not connect to server"
  assert.equal(isGitProxyOrNetworkError(stderr), true)
  assert.equal(isGitProxyOrNetworkError("remote: Repository not found."), false)
})
