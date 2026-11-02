import assert from "node:assert/strict"
import { test } from "node:test"
import { setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"
import {
  isMdShikiFencePrompt,
  STUB_MD_SHIKI_MARKDOWN,
  STUB_MD_SHIKI_PROMPT
} from "./e2e-stub-md-shiki.ts"

test("md shiki prompt only matches under stub", () => {
  const prevStub = process.env.ENJOY_E2E_STUB
  const prevUd = process.env.ENJOY_DEV_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_DEV_USERDATA = "/tmp/mike-md-shiki-test-ud"
  setE2eStubPackagedForTest(false)
  assert.equal(isMdShikiFencePrompt(STUB_MD_SHIKI_PROMPT), true)
  assert.equal(isMdShikiFencePrompt("MD Shiki Fence please"), true)
  assert.equal(isMdShikiFencePrompt("hello"), false)
  process.env.ENJOY_E2E_STUB = "0"
  assert.equal(isMdShikiFencePrompt(STUB_MD_SHIKI_PROMPT), false)
  setE2eStubPackagedForTest(undefined)
  if (prevStub == null) delete process.env.ENJOY_E2E_STUB
  else process.env.ENJOY_E2E_STUB = prevStub
  if (prevUd == null) delete process.env.ENJOY_DEV_USERDATA
  else process.env.ENJOY_DEV_USERDATA = prevUd
})

test("fixture markdown covers common fence languages", () => {
  for (const lang of ["ts", "tsx", "js", "python", "json", "bash", "go", "shell"]) {
    assert.match(STUB_MD_SHIKI_MARKDOWN, new RegExp("```" + lang + "\\n"))
  }
})
