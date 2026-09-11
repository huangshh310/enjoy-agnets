# spec/updates

> 打包应用从 GitHub Releases 检查更新、展示发行说明、下载后重启安装。最后更新：2026-09-11

## 当前真相

自动更新只在 **main** 用 `electron-updater`。Feed 是 GitHub Releases（`huangshh310/enjoy-agnets`），产物由 `.github/workflows/release.yml` 在 `v*` tag 上构建并 `electron-builder --publish always`。

用户路径：

1. 打包启动约 12s 后 `checkForUpdates`（`autoDownload: false`）。窗口挂载只走 `app.update.status` 拉快照，**禁止**一挂载就 check。开发态（`!app.isPackaged`）不打 GitHub，状态为 `dev`。
2. 有新版本：标题栏出现「有更新」芯片（按钮自身 `no-drag`）。
3. 点芯片打开应用内 Dialog，展示版本号与 Release body（更新内容）。禁止 `window.confirm`。
4. 点「立即更新」：下载（进度条）→ `update-downloaded` 后 main `quitAndInstall` 重启。UI 在 `ready` 再调 `install` 是幂等兜底。不要第三次确认。
5. 设置 → 通用：当前版本（说明里带状态）+「检查更新」。有新版本同一行变成打开说明。

IPC：`app.update.status` / `check` / `download` / `install`，推送 `app.update`（整份 `AppUpdateSnapshot`）。renderer 只走 `window.ide.app`。`release.yml` 在 tag 上校验 `v*` 去掉 v 后等于 `apps/desktop/package.json` 的 `version`；`workflow_dispatch` 也必须在该 tag 上跑。

## 不变量

- renderer **不** import `electron-updater`，不直接 `ipcRenderer`。
- 未打包不联网查更新，除非 `ENJOY_UPDATE_DEV=1`（本地对着 `dev-app-update.yml` 试）。
- 发布 tag 必须与 `apps/desktop/package.json` 的 `version` 一致（如 `v0.1.1`）。
- 密钥、Agent 循环、工作区路径不进更新频道。

## 代码入口

- 合约：`packages/ipc-contract/src/app-update.ts`
- main：`apps/desktop/src/main/services/app-update.ts`、`app-update-notes.ts`、`ipc-app-update.ts`
- preload：`apps/desktop/src/preload/index.ts` → `ide.app`
- UI：`apps/desktop/src/renderer/src/components/app-update/`
- 设置行：`settings-update-card.tsx`
- 打包：`apps/desktop/electron-builder.yml` `publish.github`
- CI：`.github/workflows/release.yml`、`.github/workflows/ci.yml`

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
