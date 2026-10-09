/**
 * 测试采集守卫：防止「写了测试但没人跑」与「测试在 node:test 下根本加载不了」。
 * 对应 design/specs/architecture.md 的测试脚本约定；守护 apps/* 与 packages/*。
 */
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
// src/main -> src -> desktop -> apps -> 仓库根。少算一层会让下面所有守卫空跑通过。
const repoRoot = join(here, "..", "..", "..", "..")

const SKIP_DIRS = new Set(["node_modules", "dist", "out", ".turbo", "coverage"])

/** apps/* 与 packages/* 里声明了 package.json 的工作区。 */
function listWorkspaces(): string[] {
  const found: string[] = []
  for (const group of ["apps", "packages"]) {
    const base = join(repoRoot, group)
    if (!existsSync(base)) continue
    for (const name of readdirSync(base)) {
      const dir = join(base, name)
      if (statSync(dir).isDirectory() && existsSync(join(dir, "package.json"))) {
        found.push(dir)
      }
    }
  }
  return found
}

/** 递归收集目录下以指定后缀结尾的测试文件，返回相对工作区根的路径。 */
function collectTests(workspaceDir: string, suffixes: string[]): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const stats = statSync(full)
      if (stats.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walk(full)
      } else if (suffixes.some((suffix) => entry.endsWith(suffix))) {
        out.push(relative(workspaceDir, full).split(sep).join("/"))
      }
    }
  }
  walk(workspaceDir)
  return out.sort()
}

function readTestScript(workspaceDir: string): string | null {
  const pkg = JSON.parse(readFileSync(join(workspaceDir, "package.json"), "utf8")) as {
    scripts?: { test?: string }
  }
  return pkg.scripts?.test ?? null
}

/** 取 `--test` 之后的收集 pattern（去掉引号）。 */
function patternsOf(script: string): string[] {
  const marker = "--test"
  const index = script.indexOf(marker)
  if (index < 0) return []
  return script
    .slice(index + marker.length)
    .split(/\s+/)
    .map((token) => token.replace(/"/g, "").trim())
    .filter((token) => token.length > 0 && !token.startsWith("--"))
}

/** glob → 正则：单趟扫描，只支持本仓用到的 `**` 与 `*`。 */
function globToRegExp(pattern: string): RegExp {
  let body = ""
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // `**/` = 零或多层目录；裸 `**` = 任意字符。
        if (pattern[i + 2] === "/") {
          body += "(?:[^/]+/)*"
          i += 2
        } else {
          body += ".*"
          i += 1
        }
      } else {
        body += "[^/]*"
      }
      continue
    }
    body += /[.+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
  }
  return new RegExp(`^${body}$`)
}

/** 文件里所有非 type 的 value import 源。 */
function valueImportSpecs(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => /^import\b/.test(line) && !/^import\s+type\b/.test(line))
    .map((line) => /from\s+"([^"]+)"/.exec(line)?.[1])
    .filter((spec): spec is string => Boolean(spec) && !spec.startsWith("node:"))
}

/** 守卫自证：路径算错会让所有检查空跑通过，这里先把「确实看到了东西」钉住。 */
function assertHarnessIsWatching(): string[] {
  assert.ok(existsSync(join(repoRoot, "pnpm-workspace.yaml")), `repoRoot 解析错了：${repoRoot}`)
  const workspaces = listWorkspaces()
  assert.ok(workspaces.length >= 10, `只发现 ${workspaces.length} 个工作区，守卫没在看仓库`)
  const total = workspaces.reduce(
    (sum, dir) => sum + collectTests(dir, [".test.ts", ".test.tsx"]).length,
    0
  )
  assert.ok(total >= 400, `只发现 ${total} 个测试文件，守卫没在看仓库`)
  return workspaces
}

test("globToRegExp 覆盖零层与多层目录", () => {
  const pattern = "src/**/*.test.ts"
  assert.ok(globToRegExp(pattern).test("src/x.test.ts"), "零层目录要匹配")
  assert.ok(globToRegExp(pattern).test("src/a/b/c.test.ts"), "多层目录要匹配")
  assert.ok(!globToRegExp(pattern).test("src/x.test.tsx"), "后缀不同不能算匹配")
  assert.ok(!globToRegExp(pattern).test("other/x.test.ts"), "根目录不符不能算匹配")
})

test("test 脚本用 glob 自动发现，不手写文件清单", () => {
  for (const workspace of assertHarnessIsWatching()) {
    const script = readTestScript(workspace)
    if (!script) continue
    const patterns = patternsOf(script)
    assert.ok(patterns.length > 0, `${relative(repoRoot, workspace)}: test 脚本没有 --test pattern`)
    for (const pattern of patterns) {
      assert.ok(
        pattern.includes("*"),
        `${relative(repoRoot, workspace)}: "${pattern}" 是手写文件路径。历史教训：手写清单引用过已删除文件，node --test 在收集阶段就退出，整套测试静默不跑。`
      )
    }
  }
})

test("磁盘上每个测试文件都被所属工作区的 glob 覆盖", () => {
  for (const workspace of assertHarnessIsWatching()) {
    const onDisk = collectTests(workspace, [".test.ts", ".test.tsx"])
    if (onDisk.length === 0) continue
    const label = relative(repoRoot, workspace)
    const script = readTestScript(workspace)
    assert.ok(
      script != null,
      `${label} 有 ${onDisk.length} 个测试文件但没有 test 脚本，它们永远不会被跑`
    )
    const patterns = patternsOf(script!)
    const uncovered = onDisk.filter(
      (file) => !patterns.some((pattern) => globToRegExp(pattern).test(file))
    )
    assert.deepEqual(uncovered, [], `${label} 未被 glob 覆盖的测试：${uncovered.join(", ")}`)
    // pattern 拼错会收 0 个文件却仍然绿，所以逐个 pattern 验证非空。
    for (const pattern of patterns) {
      assert.ok(
        onDisk.some((file) => globToRegExp(pattern).test(file)),
        `${label}: glob "${pattern}" 匹配 0 个文件`
      )
    }
  }
})

test("测试文件不得 value-import .tsx（node strip-types 不编译 JSX）", () => {
  for (const workspace of assertHarnessIsWatching()) {
    for (const file of collectTests(workspace, [".test.ts", ".test.tsx"])) {
      const offender = valueImportSpecs(readFileSync(join(workspace, file), "utf8")).find((spec) =>
        spec.endsWith(".tsx")
      )
      assert.equal(
        offender,
        undefined,
        `${relative(repoRoot, workspace)}/${file} 直接 import 了 ${offender ?? ".tsx"}；把纯函数抽到同名 .ts 再测`
      )
    }
  }
})

test("测试直接依赖的源文件不得 value-import 别名或合约入口", () => {
  // 两类都会让 node --test 在加载期炸：
  // 1) @renderer / @ 别名只有 Vite 与 tsconfig 认（design/specs/settings.md 记过）。
  // 2) @enjoy-agents/ipc-contract 入口是无后缀 re-export，Node 解析不到（design/specs/ipc.md 记过）。
  //    需要常量请走叶子子路径 @enjoy-agents/ipc-contract/tool-names。
  // 类型 import 会被 strip-types 擦除，所以只查 value import，且只看测试直接依赖的那一层源文件。
  const desktop = assertHarnessIsWatching().find((dir) => dir.endsWith(join("apps", "desktop")))
  assert.ok(desktop, "找不到 apps/desktop 工作区")
  const ENTRY_PACKAGES = [
    "@enjoy-agents/ipc-contract",
    "@enjoy-agents/agent-core",
    "@enjoy-agents/agent-harness",
    "@enjoy-agents/providers",
    "@enjoy-agents/db",
    "@enjoy-agents/knowledge"
  ]
  const forbidden = (spec: string) =>
    spec.startsWith("@renderer/") ||
    spec.startsWith("@/") ||
    ENTRY_PACKAGES.includes(spec)
  for (const file of collectTests(desktop!, [".test.ts"])) {
    const testPath = join(desktop!, file)
    for (const spec of valueImportSpecs(readFileSync(testPath, "utf8"))) {
      if (!spec.startsWith(".")) continue
      const depPath = resolveRelative(dirname(testPath), spec)
      if (!depPath) continue
      const offender = valueImportSpecs(readFileSync(depPath, "utf8")).find(forbidden)
      assert.equal(
        offender,
        undefined,
        `${file} 依赖的 ${spec} value-import 了 ${offender ?? ""}，node:test 加载不到；用 ipc-contract 的叶子子路径或相对路径`
      )
    }
  }
})

/** node 的相对导入要显式后缀；补 .ts / 原样 / index.ts 三种落点。 */
function resolveRelative(fromDir: string, spec: string): string | null {
  for (const candidate of [spec + ".ts", spec, join(spec, "index.ts")]) {
    const full = join(fromDir, candidate)
    if (existsSync(full) && statSync(full).isFile()) return full
  }
  return null
}
