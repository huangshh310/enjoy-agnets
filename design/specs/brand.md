# spec/brand

> 产品主标来自 `apps/desktop/public/enjoy-ui-kit`。最后更新：2026-10-04（macOS 菜单栏应用名开发态也写成 Enjoy Agents）

## 当前真相

品牌源只在 **enjoy-ui-kit**。连字 **ej**（Klein 底 `#1B3A8A`，金点 `#C4A574`）。kit 原文：`USAGE.md`。

| 用途 | 资源 | 接线 |
|---|---|---|
| 标题栏 / 侧栏 ≤32px 标 | `svg/icon-small.svg` | `AppMark` |
| 界面标 >32px | 浅色 `icon-light` / 暗色 `icon-dark` | `AppMark` + `useThemeMode` |
| 组合字锁 | 铬上拼 `enjoy` + `AGENT IDE`，不用 lockup SVG | `AppWordmark` |
| 任务栏 / Alt+Tab / 最小化 | Windows `resources/icon.ico`，其它 `resources/icon.png`（512） | `BrowserWindow.icon` |
| macOS Dock / Cmd+Tab（含 `pnpm dev`） | 同上 PNG | `app.dock.setIcon`（`applyMacDockIcon`） |
| macOS 菜单栏应用名 | 开发态改本仓库 `Electron.app` 的显示名；打包写 `CFBundleName` 与 `CFBundleDisplayName` | `scripts/ensure-mac-menu-name.mjs`、`electron-builder.yml` `mac.extendInfo` |
| 打包 exe / NSIS / 桌面快捷方式 | `build/icon.ico` | electron-builder `win` + `nsis` |
| 打包 macOS `.app` / 桌面别名 / Finder | `build/icon.icns` | electron-builder `mac.icon` |
| Linux 打包 | `build/icon.png`（512） | `linux.icon` |
| 渲染进程 favicon | `svg/favicon.svg` + `png/favicon-32.png` | `index.html` |

`resources/` 与 `build/` 的 icon 由脚本从 kit PNG 派生：

```bash
node apps/desktop/scripts/write-app-icon.mjs
```

界面标走 `AppMark` / `AppWordmark`，不要用字母「E」圆或 Remix 冒充主标。

**未做：** kit 启动屏（Pitch 满底 + lockup）。需要时另开，不要把 lockup SVG 嵌进标题栏——它自带 Paper/Pitch 满底。

## 不变量

- 金点全系统只一颗。不要加第二颗点、光晕、渐变。
- ≤32px 必须用 `icon-small`，不要直接缩小 1024。
- 不要把 e/j 焊成 P，不要用 Eclipse 窗口当 Logo。
- 打包图标与运行时任务栏图标必须同源（enjoy klein PNG 派生），不要各用一套。

## 代码入口

- Kit：`apps/desktop/public/enjoy-ui-kit/`
- 常量：`apps/desktop/src/renderer/src/components/brand/constants.ts`
- 界面标：`app-mark.tsx`、`app-wordmark.tsx`
- 窗口 icon / Dock：`apps/desktop/src/main/index.ts`（`resolveAppIconPath`、`applyMacDockIcon`）
- macOS 开发态菜单名：`apps/desktop/scripts/ensure-mac-menu-name.mjs`（`dev` / `start` 之前）
- 派生脚本：`apps/desktop/scripts/write-app-icon.mjs`
- 打包：`apps/desktop/electron-builder.yml`、`apps/desktop/build/`

## 已知坑

- 改 `BrowserWindow.icon`、`app.dock.setIcon` 或 `resources/icon.*` 后必须重启 Electron。
- Windows 小尺寸任务栏靠 ICO 的 16/32 帧；只塞一张 1024 PNG 会发糊。
- macOS **忽略** `BrowserWindow.icon`。开发态可执行文件是 `Electron.app`，只设窗标 Dock 仍是原子标。必须 `app.whenReady` 后 `app.dock.setIcon`。
- macOS 菜单栏最左应用名读 `CFBundleName`，不读 `BrowserWindow.setTitle`，也不读 `app.setName`。开发态 `ensure-mac-menu-name.mjs` 只改显示名，禁止改 `CFBundleIdentifier`，禁止为改名重签（这份 Electron 的 Info.plist 未封进签名，重签会换 cdhash，屏幕录制授权会掉）。禁止 `app.setName`：userData 按 package.json 名字落在 `Application Support`。`pnpm install` 会还原 plist，下次 `pnpm dev` 再写回。已经打开的窗口要退出后重开才换菜单名。打包名是 `productName`，并在 `mac.extendInfo` 写死 `CFBundleName` / `CFBundleDisplayName`。
- 打包后的桌面 / Finder / Dock 读 `.app` 里的 `CFBundleIconFile`（`build/icon.icns`），不是 `BrowserWindow.icon`。没有 `mac.icon` / `.icns` 时会回落到 Electron 默认标。`iconutil` 只在 darwin 上有，改 kit PNG 后要在 Mac 上重跑派生脚本。
- electron-builder 的 `icon` 相对 `directories.buildResources`（`build/`），不是仓库根。
- lockup SVG 带满底色块，铬里必须用 `AppMark` + `AppWordmark` 组合，不要 `<img src="lockup-*.svg">`。
