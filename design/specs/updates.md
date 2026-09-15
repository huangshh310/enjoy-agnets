# spec/updates

> 打包应用从 GitHub Releases 检查更新、展示发行说明、下载后重启安装。最后更新：2026-09-15

## 当前真相

自动更新只在 **main** 用 `electron-updater`。Feed 是 GitHub Releases（`huangshh310/enjoy-agnets`），产物由 `.github/workflows/release.yml` 在 `v*` tag 上构建并 `electron-builder --publish always`。

用户路径：

1. 打包启动约 12s 后 `checkForUpdates`（`autoDownload: false`）。窗口挂载只走 `app.update.status` 拉快照，**禁止**一挂载就 check。开发态（`!app.isPackaged`）不打 GitHub，状态为 `dev`。
2. 有新版本：标题栏出现「有更新」芯片（按钮自身 `no-drag`）。
3. 点芯片打开应用内 Dialog，展示版本号与 Release body（更新内容）。禁止 `window.confirm`。
4. 点「立即更新」：下载（进度条）→ `update-downloaded` 后 main `quitAndInstall` 重启。UI 在 `ready` 再调 `install` 是幂等兜底。不要第三次确认。
5. 设置 → 通用：当前版本（说明里带状态）+「检查更新」。有新版本同一行变成打开说明。

IPC：`app.update.status` / `check` / `download` / `install`，推送 `app.update`（整份 `AppUpdateSnapshot`）。renderer 只走 `window.ide.app`。`release.yml` 在 tag 上校验 `v*` 去掉 v 后等于 `apps/desktop/package.json` 的 `version`；`workflow_dispatch` 也必须在该 tag 上跑。

发版：`apps/desktop/package.json` 的 `version` 只在准备让用户装到的那一刀递增，然后推匹配的 `v*` tag。手动入口是仓库根 `./scripts/release-tag.sh`（读 desktop version，校验已提交）。CI 失败 **不涨号、不新开 tag**，同一脚本加 `--retry`（只 force 该版本 tag，禁止 force `main`）：

```bash
./scripts/release-tag.sh          # 首次：git tag -a + push
./scripts/release-tag.sh --retry  # 失败重试：git tag -f + push -f refs/tags/vX.Y.Z
```

`create-release` 见 Release 已存在则跳过，matrix 往**同一个** Release 传资产。空的失败 Release 可留可删，不要为此改 semver。`electron-updater` 读的是资产里的 `latest.yml`，不是 tag 被推过几次。

## 不变量

- renderer **不** import `electron-updater`，不直接 `ipcRenderer`。
- 未打包不联网查更新，除非 `ENJOY_UPDATE_DEV=1`（本地对着 `dev-app-update.yml` 试）。
- 发布 tag 必须与 `apps/desktop/package.json` 的 `version` 一致（如 `v0.1.1`）。
- `version` / `v*` 只对应一次用户可安装的产品切口。发版 CI 失败不涨号。
- 密钥、Agent 循环、工作区路径不进更新频道。

## 代码入口

- 合约：`packages/ipc-contract/src/app-update.ts`
- main：`apps/desktop/src/main/services/app-update.ts`、`app-update-notes.ts`、`ipc-app-update.ts`
- preload：`apps/desktop/src/preload/index.ts` → `ide.app`
- UI：`apps/desktop/src/renderer/src/components/app-update/`
- 设置行：`settings-update-card.tsx`
- 打包：`apps/desktop/electron-builder.yml` `publish.github`
- CI：`.github/workflows/release.yml`、`.github/workflows/ci.yml`
- 手动打 tag：`scripts/release-tag.sh`（`--retry` 失败重推同一 tag）

## 已知坑

- macOS 未公证时，用户首次打开会遇 Gatekeeper；自动更新仍走 zip。没有 `CSC_LINK` 时 Action 必须 `CSC_IDENTITY_AUTO_DISCOVERY=false`，否则 mac 任务在签名步骤失败。
- `electron-builder` 的 GitHub publisher 和 updater 读的是 **Release 资产**里的 `latest.yml` / `latest-mac.yml` / `latest-linux.yml`，不要改名。
- 审查栏曾把 query key 写成不存在的名字；更新频道不要再发明第二套 `app.updater.*`。
- 开发态 `pnpm dev` 没有 `app-update.yml`，检查更新应返回 `dev`，不要抛到设置页红字。
- `ENJOY_UPDATE_DEV=1` 必须同时 `forceDevUpdateConfig` 和 `updateConfigPath = …/dev-app-update.yml`（相对 `out/main` 是 `../../dev-app-update.yml`）。只改环境变量时 electron-updater 会静默跳过，快照停在 `checking`，设置按钮一直 disabled。`checkForUpdates` 结束后若仍是 `checking`，回落 `up-to-date`。
- `quitAndInstall` 用 `installScheduled` 只调一次。不要在 `update-downloaded` 和 UI 按钮上各调一次无守卫的 quit。
- `electron-builder` 会读 `apps/desktop/package.json` 的 `electron-updater` **字面量**。写成 `catalog:` 会被当成非法版本直接 `exit 1`（v0.1.0 三个平台同一秒挂）。此依赖不要进 pnpm catalog，桌面包必须写 semver（当前 `^6.6.2`）。发布前本地跑 `pnpm exec electron-builder --dir --publish never`。
- `electron-builder@26.15` 会读 `@electron/get` 的 `ElectronDownloadCacheMode.ReadWrite`。锁到 `3.0.0` 时该枚举不存在，打包报 `Cannot read properties of undefined (reading 'ReadWrite')`。workspace `overrides` 钉 `@electron/get@3.1.0`。
- `release.yml` 必须 `defaults.run.shell: bash`。Windows 默认 PowerShell，没有 `sed`，v0.1.1 的「删 npmmirror」步骤 31 秒就挂。不要在 Windows 上跑 GNU/BSD sed。
- 本机 `.npmrc` npmmirror 可留着：v0.1.0 证明 GitHub runner 也能用它装 Electron。不要为 CI 删镜像反而引入 Windows 不兼容命令。
- GitHub-hosted runner 默认 Node 堆约 2GB。`electron-vite` 打 renderer（含 shiki 语言包，产物约 15MB）会 OOM：`JavaScript heap out of memory` / exit 134。`release.yml` 必须设 `NODE_OPTIONS=--max-old-space-size=4096`（runner 内存 7GB，不要上 8GB）。
- Linux AppImage 不能用 scoped npm 名当可执行文件。`@enjoy-agents/desktop` 含 `@` `/`，v0.1.3 只挂 ubuntu：`executableName contains characters that cannot be safely used in file paths`。`electron-builder.yml` 必须显式 `executableName: enjoy-agents`（不要改 workspace package name）。
- electron-builder 26 的 `linux.desktop` 只能是 `{ entry, desktopActions }` 或 `null`。写成旧式 `{ Name, StartupWMClass }` 会 schema 校验失败，三个平台在 Publish 第一步就挂（v0.1.4）。不要为 WM_CLASS 警告加这块。
- 三个平台并行 `--publish always` 会竞态：先完成的 POST 创建 Release，后完成的再 POST 同一 `tag_name` 得到 `422 already_exists`（v0.1.5 mac）。`createRelease()` 不消化 422。正确做法：先单独 job `gh release create`（已存在则跳过），matrix 再上传资产。设 `EP_GH_IGNORE_TIME=true`，否则超过 2 小时重跑会拒传。不要用 `workflow_dispatch` 无 tag 发版。
- `pnpm install --frozen-lockfile` 要求每个 workspace 包都在 `pnpm-lock.yaml` 的 `importers` 里。新增 `apps/*` / `packages/*` 后，无依赖包在 pnpm 12.3.4 上 `pnpm install --lockfile-only` 会跳过 resolution、不写 importer。必须让 lockfile 出现该路径（空包写成 `apps/foo: {}`）。v0.1.7 三平台同一秒挂 `ERR_PNPM_PACKAGE_MANAGER_NO_IMPORTER`（缺 `apps/browser-extension`）。
- v0.1.0–v0.1.6 打包脚本迭代、以及 v0.1.7 lockfile 失败后发 v0.1.8，都把 CI 失败当成新版本。错误。失败应 `git tag -f` + `git push -f origin vX.Y.Z` 重推同一 tag。已发出去的号不必改写历史；空 Release（如 v0.1.7）从 GitHub Releases 删掉即可。
