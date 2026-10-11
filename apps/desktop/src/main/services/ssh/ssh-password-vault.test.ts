import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import {
  LINUX_INSECURE_SECRET_BACKEND,
  isSecretStorageAvailable
} from "../secret-storage.ts"

test("SSH 加密探测带 packaged，并走隔离 userData 第三闸", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ssh-password-vault.ts"), "utf8")
  assert.match(src, /readSecretStorageProbe/)
  assert.match(src, /isSecretStorageAvailable/)
  assert.equal(
    isSecretStorageAvailable({
      encryptionAvailable: false,
      linuxBackend: LINUX_INSECURE_SECRET_BACKEND,
      platform: "linux",
      env: { ENJOY_E2E_STUB: "1" },
      packaged: true,
      isolatedUserData: false
    }),
    false
  )
})
