import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // 失败时保留 trace / error-context 到 outputDir（e2e/test-results），CI e2e-window 失败时整目录上传。
  // 注意：trace 只对 Playwright 自带 page/context fixture 生效；自己 _electron.launch 的用例不会自动录 trace，
  // 它们留下的是 error-context.md（失败时的 ARIA 快照）和各 spec 自己写的截图。
  use: { trace: "retain-on-failure" },
  projects: [{ name: "contracts" }]
})
