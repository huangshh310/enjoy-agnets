# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-10-09（审批硬拒带 `bare_coords_disabled`；未知观察号 Dock；铬 fail-closed 仅 `sensitive === false` 才给本会话/始终允许；CU-P1-36 高级坐标已绑）

## 当前真相

产品页是 `#/settings/computer-use`（设置「智能体与模型」，导航 Beta）。总开关默认关。关掉时普通轮次没有 `desktop_*`。消息开头的 `/computer-use`（大小写和首尾空白忽略；引号、代码块、引用开头不算）只让这一发按执行模式注册这些工具，并带上已有 `desktopBias`，不把偏好写成开。探索模式这一发改为执行，只限这一发。`#/settings/tools` 不再放电脑操控。蓝边、始终允许、本会话任意桌面、感知试用和计算器只在产品页，不和导航各做一套。指针、线程预览和蓝边在同一张「画面」卡。指针「跟随系统 / 自定义」只改 overlay 边缘颜色。预览开/关和紧凑/大只影响线程里的图，关掉预览时尺寸不可点，也不停 run。预览铬要总开关和蓝边都开着。恢复默认只重置开关、指针、预览尺寸和高级坐标（关），不清始终允许簿。macOS 权限行是辅助功能、屏幕录制、输入监听，只认即将启动的 helper；未签名仍是「请安装带签名的版本」。输入监听授权后，别的应用在前台时物理 Esc 能打断当前动作；未授权时 Esc 只在 Enjoy 窗口里生效。Windows / Linux 只写「尚未在真机上验收」，不画 Grant。

设置里的 **电脑操控** 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。单次口令即使总开关关着也注册，但仍不是 `plan` / `ask`。旧坐标工具已删。**§3.2e / H5**：未做真机 GUI 冒烟前，设置与文档不得把 Windows / Linux 标成「可用」或 available；macOS 是当前支持路径。`ENJOY_CU_GUI=1` 才跑拍树测试，跳过 ≠ 通过。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。**CU-P1-36 / §3.6**：prefs `desktopAdvancedCoords` 默认 **OFF**。主路径是 `desktop_snapshot` → `desktop_act(elementId)`。入参带任一 `x`/`y`/`x2`/`y2`（含 drag；**即使同时有 elementId**）即坐标通道：未开时硬拒 `bare_coords_disabled`（审批 `{ type:"denied", code:"bare_coords_disabled" }` + 执行面拦截，**禁止静默执行、也不进 Dock**；码经现有 `tool.result.result.code` 到 renderer，无新频道）；打开后**每次**进 Dock，且 `bypassesSessionAllow`，**不吃**会话表 / Always-allow / `desktopAlwaysAllowAppKeys`。审批与执行面共用 `desktopActIsBareCoord`。`allowForeground: true` / 敏感窗仍每次问。`#/settings/computer-use`「电脑操控」卡已嵌「高级坐标」开关（出厂 OFF，testid `advanced-coords-row` / `advanced-coords-toggle`，正文「一般用不到…」，工程词只进 tooltip；`setPreferences({ desktopAdvancedCoords })`）。`action_failed` 只保留失败事实：禁止附带新 `observationId` / 缩略 / 「继续点这里」；`code=action_failed` 即使带 `success: true` 也不得报成功。失败不还观察、不签发下一张树；再点必须显式 `desktop_snapshot` / `desktop_screenshot`。观察编号由 main 签发，30 秒、用过即废。**待批冻结该观察的 TTL 时钟**（`freeze` / `unfreeze`，不改 `OBSERVATION_TTL_MS`）。Allow：解冻再 `take`；仍 stale（过期或账本无此号）则对同一应用 **重拍一次**，匹配 `appKey` + 控件稳定键（**role+name**；路径 `elementId` 不是跨快照指针，有 role/name 时必须对上）后点**新**观察，旧号作废。身份偏弱（只有路径 id）回 `needs_second_confirm`，不静默点。对不上返回 `needs_second_confirm`（带 `previousThumbnailPath` + `thumbnailPath`），**禁止对过期观察静默点击**。主循环 `executeStoredTool` / 活泵 `desktop_act.execute` 看到该码时 **再停一张 Permission Dock warn 卡**（SoT [`../previews/cu-p1-r-second-confirm.html`](../previews/cu-p1-r-second-confirm.html)），不是只把字符串丢给模型。确认（`allow`，testid `approval-second-confirm-allow`）只对**新**观察号 resume；取消（`deny`，`approval-second-confirm-cancel`）discard 新号，不 act。缺任一缩略图主按钮禁用；确认后若仍缺图则 `screenshot_unavailable`，绝不静默 click。不新开决策枚举。Deny：`discard`，不 act。已成功消费的编号再点是 `stale_observation`，不重拍。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后账本为空：`executeStoredTool` → `resumeDesktopAct` 必须显式 `stale_observation`（或随后 `needs_second_confirm`），走同一条重拍路；**禁止假放行 / 报 success**。待批 `parkDesktopActArgs` 冻结 TTL；`enrichDesktopActApprovalArgs` 再补 `appKey` / `appKeySource` / `appName` / `observationId` / `action` / `elementName` / `thumbnailPath?` / `bypassesSessionAllow` / **`sensitive`** / 本观察缩略图。`sensitive` 由 main 用现有 `desktopActIsSensitive` 经 `stampDesktopActSensitiveFlag` **必写**布尔（park / 二次确认 enrich 同一条路）。Zod `DesktopActApprovalArgs.sensitive` 必填。renderer `desktopApprovalView` **只读**该旗标：敏感时 `canSessionAllow` / `canAlwaysAllow` 为假；**只有 `args.sensitive === false` 才当普通应用**，缺字段 / true / 其它值一律 fail-closed 当敏感。禁止 renderer 自写名单或再调 `desktopActIsSensitive`。`applyApprovalDecision` 对 `allow_session` / `allow_always` 再按观察并入后的 args 算 `desktopActIsSensitive`；敏感则只当一次允许，**不**写会话表、**不**写持久簿。敏感名单含系统设置 / 钥匙串 / 密码 / 支付，以及终端类（darwin Terminal / iTerm2；win Windows Terminal / PowerShell / cmd；linux GNOME Terminal / Konsole / xterm / Alacritty / kitty / WezTerm）；**不含** Finder / Explorer。闸语义不变：坐标 / 前台 / 敏感 / 二次确认仍每次问。`needs_second_confirm` 记住批准时那张图（stash 键 = 新观察号）；主循环 / 活泵 **repark** 时 `enrichSecondConfirmApprovalArgs` 再补 `previousThumbnailPath` / `previousThumbnailDataUrl` 与 `thumbnailPath` / `thumbnailDataUrl`。Permission Dock 二次确认走同一张 `desktop-approval-card.tsx` 的 warn/danger 变体（左「批准时 · 批前观察」| 右「重拍后 · 新观察」），真源 #84。二次确认底栏 testid `approval-second-confirm-cancel` / `approval-second-confirm-allow`；缺任一 data URL 时主允许禁用。首次允许仍是单缩略图 + 摘要 + 四选一（选项 +「继续」，见 CU-P1-A）。二次确认 args 带 `bypassesSessionAllow`，不写 P1-S 会话表，也不写持久簿；底栏仍是确认/取消两钮，不露始终允许。

**§3.2b / CU-P1-S 会话 Allow（policy B）**：SoT 是进程内 `conversationDesktopAllow`，按 Enjoy `sessionId`。键只认 `desktop_act:<appKey>` 与 `desktop_act:*`，**禁止**裸 `desktop_act`。`allow_session` write-through 会话表 + 本轮 `sessionApprovedTools`。新 run 从该会话表 **复制** 一份进 ActiveRun；run 结束 **不清** 会话表、**不**升全局。切焦点 / 离开再回来仍记得。清空只在：该对话删除、该对话归档、人手撤销某应用、关掉 anyDesktop、进程退出。设置「本会话任意桌面」默认关，开则写当前会话的 `desktop_act:*`，**禁止**写入 `builtin_tools` / 磁盘偏好。旧盘里的 `anyDesktopSession` 忽略。`approvalPolicyFromPrefs` 读会话表 ∪ run 副本，并用 `listDesktopAlwaysAllowAppKeys` 把 prefs `desktopAlwaysAllowAppKeys` 投影成裸 `appKey[]`（读侧兼容旧 `string[]`）。无 appKey 不写白名单，只当一次允许。appKey 优先级：`bundleId` → `exe` / AUMID → 规范化 `appName`；pid 不是键。`resolveToolApproval` 判断前由 `lookupDesktopObservation`（main `peekDesktopObservation`）按 `observationId` peek 账本，观察的 `appName` / `bundleId` / `exe` / `aumid` / `appKey` **覆盖**模型自报（模型不能把 Terminal 降成备忘录）；未知或过期号标 `unresolvedObservation`，闸当时看不到执行面 `stale_observation`：`sessionAllowsDesktopAct` 与持久簿必须 false，直接 Dock（`user-approval`），禁止指望后续 stale 处理。坐标 / `allowForeground`（`bypassesSessionAllow`）/ 敏感窗 / **二次确认**（stash 命中该 `observationId`，或 args.`needsSecondConfirm` / `code=needs_second_confirm` / 已有 previous 缩略图）每次问。`desktopActAlwaysAsks` 为真时 `sessionAllowsDesktopAct` 必须 false，**禁止**因会话表已有 `desktop_act:<appKey>` / `desktop_act:*` 而跳过二次确认卡、直接 act。Permission Dock 桌面名片四选一（同一张卡，不是新壳）：**允许一次** `approval-allow`→`allow` / **本会话允许此应用** `approval-session`→`allow_session` / **始终允许此应用** `approval-always-app`→`allow_always` / **拒绝** `approval-deny`→`deny`；testid 在选项上，底栏只有「继续」才落决策。仅 `args.sensitive === false` 且有稳 `appKey` 时默认选中「本会话允许此应用」；始终允许可见但不突出（不加粗、无蓝环、非默认）。敏感（缺字段也算）默认「允许一次」，卡上警示「这是敏感应用，每次都会问你」，不露本会话/始终允许。坐标 / 前台（`bypassesSessionAllow`）把本会话/始终允许划掉，不吃白名单；无稳 `appKey` 仍不露始终允许。禁止再把 `approval-always` 接到持久路径。`bypassesSessionAllow` 或无 appKey 时会话项不可选。无稳 `appKey`（无 bundleId / exe / AUMID / 规范化 appName；pid 不是键）时隐藏始终允许。一句话摘要走 `desktopActApprovalText`，副标题可显示 appKey。

**CU-P1-A Always-allow**：`allow_always` **只写**本机 prefs `desktopAlwaysAllowAppKeys`（`{ appKey, displayName }[]`），不写会话表。本会话钮只写 `conversationDesktopAllow`，不升簿。设置「电脑操控」内嵌「始终允许的应用」：名单 +「撤销」只清簿、立即刷新；空态「还没有始终允许的应用…」；说明必须含「坐标/前台/敏感仍每次问」；脚注写明「本会话允许」不在本页。禁持久 `desktop_act:*` / 任意桌面永久。命中顺序：先 peek 并身份 → `desktopActAlwaysAsks`（坐标 / 前台 / 敏感 / `needs_second_confirm` / 未解析观察）→ `sessionAllowsDesktopAct` → `persistentAlwaysAllowsDesktopAct(args, listDesktopAlwaysAllowAppKeys(...))`。`approvalPolicyFromPrefs` 已把投影后的裸 `appKey[]` 与 `lookupDesktopObservation` 灌进 `ApprovalPolicy`。二次确认路径硬拒绝写簿：`rememberDesktopAlwaysAllowFromArgs` 在 `desktopActNeedsSecondConfirm` 时返回 `null`，Dock 不露 `approval-always-app`。视觉真源 [`../previews/cu-p1-a-always-allow.html`](../previews/cu-p1-a-always-allow.html)。

产品页才是电脑操控中心，不在内置工具再挂一张。总开关打开后，标题旁才画徽章：能点写「就绪」，未签名写「未签名」，缺授权写「未授权」。开关关掉不画「未就绪」，避免看起来像开关没生效。绿仍不是开关本身。未就绪时权限区只出一句人话（没有执行器 / 请安装带签名的版本 / 请打开仍未授权的那一项 / 没有图形会话 / 医生没回来请再检测）。**不展示**二进制路径、签名身份、开通三拍。绿仍只认 `helperSigned` + helper AX，禁止宿主 Electron AX / 遗留 `signed` 假绿。页内按卡片划分：
- **第 1 段 (驱动与权限)**：macOS 辅助功能、屏幕录制、输入监听（认 helper，说明带后台静默交互原则）；未签名或没有执行器时不把权限行显示成「未授权 · 打开设置」；没有图形会话只留这一句，不另加平台提示；Windows / X11 / Wayland 只出平台提示（尚未标为可用），不再叠一条权限阻断；
- **第 2 段 (视觉反馈与安全制动)**：冷静蓝边 + 「正在操控」顶栏 + 100ms Esc 应急刹车 + 预览铬演示；
- **第 3 段 (应用授权与安全保护区)**：常驻系统受保护禁区声明（钥匙串/偏好设置/密码/支付/**终端类**硬编码每次问，绝不自动放行；Finder / Explorer 不在禁区）+「始终允许的应用」名单（撤销只清簿）+「高级坐标」逃逸舱（默认关）+ 高级「本会话任意桌面」（从设置页把当前焦点 `sessionId` 传到 `DesktopAnyDesktopDetails`；**无焦点会话时开关禁用**，提示「请先打开对话」/ “Open a chat first”；main 无 `sessionId` 不写会话表保持 no-op）；
- **第 4 段 (感知透视与快速体验)**：动作「检测权限 / 测试屏幕感知 / 试一下 · 计算器」（试一下只切执行并预填 `@桌面`，不自动开跑）+ Midscene.js 风格屏幕感知透视面板（`DesktopPerceptionInspector`：捕获缩略图视口 + 识别目标窗口/Bundle ID/可交互控件列表标签透视）。

空态命令 pill 在 CU 开且权限就绪、`useDesktopMentionApps` 有真实 `displayName` 时多一条「@{应用} 帮我在 {应用} 里…」；首帧不吃缓存，未开 / 未授权 / 名单空不出现，禁止写死应用名。`action_failed` / `bare_coords_disabled`（含审批层 denial 带同一 `code`）线程卡只说人话，不露工程码、不附假观察。坐标硬拒正文禁止「裸坐标 / 逃逸舱」。系统通知四态走 `@enjoy-agents/ipc-contract/desktop-notify`（待审批脱敏 + 已完成 / 已停止 / 出错）。

**CU-P1-B Composer 提及**：电脑操控开时，探索/执行都可点 `@桌面` / `@应用名`（产品锁写 **`@桌面`**，不沿用旧预览 `@电脑`）。候选与 `desktop_list_apps` 同源（IPC `builtinTools.desktopListApps`）：行上展示名 + 稳 `appKey`（mono）。Execute 下输入下方可选偏置芯片「桌面」或应用名 + appKey 摘要（CU 提示，不是第二条引擎条）。Composer 发送把 `readDesktopMentionBias` 收成 `agent.run.desktopBias`（`host` 或稳 `appKey`）；开流 `createCodingAgent` 把已注册的 `desktop_*` **提前**，并加一行 Prefer 指令，不堆长文、不改 `toolApproval`。helper 失败名单为空，只留宿主 `@桌面`，禁止补假应用。**提及 ≠ 放行**：Approval Dock / 会话表 / Always-allow / 二次确认 / overlay 闸不变，首次 `desktop_act` 仍进 Dock（除非会话/簿已放行）；点另一个 appKey 仍按 §3.2b 再批。Explore 允许同一枚提及芯片，但**不**注册 `desktop_*`（`shouldRegisterDesktopControlTools` 不看 bias）、不点亮 overlay、不把偏置芯片标成已连接；可见人话「桌面控制需切换到执行」。无稳 `appKey`（仅 pid）可进候选，**隐藏**始终允许路径，禁止用 pid 当键，也不写簿。不是插件店，不虚构 NotInstalled.app。视觉真源 [`../previews/cu-p1-b-composer-mention.html`](../previews/cu-p1-b-composer-mention.html)。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`（darwin helper 须 codesign，见下）。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`，未签名不得报就绪。

设置开关下调用 `desktopDoctor`。`line` 与设置页中文阻断句同一套。**医生绿当且仅当即将 spawn 的 helper 路径一致、具备有效团队签名（`helperSigned`，非 ad-hoc / 未签名），且该 helper 进程自己也能过 AX。** 宿主 Electron `systemPreferences.isTrustedAccessibilityClient` / `hostAccessibility` / 遗留 `signed` 不能单独报绿。未签名或身份错位返回 `executor_unsigned` / `executor_identity_mismatch`，开通徽章不得当就绪。医生请求失败且总开关开着时，徽章写「未确认」，并提示再检测一次，不假装没有执行器。开关关掉不画徽章。

打包 `beforePack`：`scripts/stage-computer-use.cjs` 编出 `native/computer-use/pack/<platform>-<arch>/`。darwin 在有 `CU_CODESIGN_IDENTITY` / `CSC_NAME` / `APPLE_CODESIGN_IDENTITY` 时 `codesign` 真实 helper，并写 `computer-use.identity.json`；没有身份不假装已签名。开发 `swiftc` → `.build/computer-use` 未签名不得报「已就绪」。

右栏 Desktop 只读最近观察（窗名 / appKey / 缩略若有；testid `desktop-rail-card` / `desktop-rail-empty` / `desktop-rail-thumb`）。无观察写「还没有桌面观察」，禁止假装「正在控制」。Execute 下已批目标的 `desktop_act`（click/type/key/move/drag/scroll，**不含 wait**）进入 `deliverAct` 时点亮已有 overlay 窗冷静蓝边 + 「正在操控 · {app}」+「停止」/ Esc（testid `cu-overlay-frame` / `cu-overlay-stop`）。`onAct` 把当前 runId 传进 `beginDesktopActOverlay`（ALS `runWithActiveRunId` 绑活泵 / `executeStoredTool`，再退回 `currentPumpingRunId`）。结束 / 取消 / 失败 / 一键停立刻熄，**不**画空成功条。一键停 / Esc：先熄铬，再 `cancelInFlightDesktopAct`（拒绝在途 act + `child.kill`），再 `abortAgent` **该** runId（已知时不扫全部 ActiveRun）。Deny 待批 `desktop_act` 发生在 `deliverAct` 之前，overlay 本来就没亮。overlay 是铬，不是第二套遥控器；审批仍走 Permission Dock（含二次确认）。探索态（`plan`/`ask`）`createBuiltinAgentTools` 经 `isReadOnlyAgentMode` + `shouldRegisterDesktopControlTools` **不**调 `desktopControlTools()`，不 ensure overlay；能力轨在电脑操控开启时出「桌面仅执行」。视觉真源 [`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)；产品锁 [`../references/cu-p0-c-overlay.md`](../references/cu-p0-c-overlay.md)。不宣称像素 1:1。§3.2a TTL 冻结 / resume / 重拍已由 #80 落地；UI 待批文案写「TTL 已冻结」。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具，也不 ensure overlay、不画「正在操控」。
- overlay 只在 Execute 已批 `desktop_act`（非 wait）进行中可见；结束 / 取消 / 失败 / 停立刻熄，禁止空成功条与第二套远程壳。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 待批冻结 TTL，禁止只靠加长 30s；过期观察禁止静默点击。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。
- 二次确认闸盖住会话白名单与持久簿：stash / `needsSecondConfirm` 时禁止 `sessionAllowsDesktopAct` / `persistentAlwaysAllowsDesktopAct` 自动放行，也禁止 `rememberDesktopAlwaysAllowFromArgs` 写簿。
- 裸像素坐标默认关。未开不得静默执行；打开后每次 Dock，且不吃会话表 / Always-allow。
- `action_failed` 不得签发或附带可继续 act 的新观察。需要新观察必须再 `desktop_snapshot` / `desktop_screenshot`。
- darwin：`desktop_doctor.success` 只在 spawn helper 签名匹配且该进程过 AX 时为真。开通绿必须看 `helperSigned`，禁止用宿主 `signed` / `hostAccessibility` 冒充。
- 未开「任意桌面」时，禁止裸 `desktop_act` 会话级放行；开了只命中 `desktop_act:*`。
- 会话 Allow / anyDesktop 只活在 `conversationDesktopAllow`（按 sessionId）。禁止当全局 `builtin_tools` 偏好。归档或删除该对话必须清表。
- 设置页无焦点 `sessionId` 时，「本会话任意桌面」开关必须禁用并提示先打开对话；禁止看起来能开、main 却 no-op。
- 闸判断时账本未知或过期的 `observationId`：会话 Allow / 任意桌面 / Always-allow 簿不得命中，必须 Dock（`user-approval`）。禁止依赖后续 `stale_observation`。
- `DesktopActApprovalArgs.sensitive` 必填（MUST）。renderer 仅当 `sensitive === false` 才露会话/始终允许；缺省 / 非 false 当敏感。`applyApprovalDecision` 对 `allow_session` / `allow_always` 再算，敏感或未解析观察只当一次允许，不写表不写簿。
- 系统受保护禁区（钥匙串、系统偏好设置、密码管理器、支付窗口、**终端类应用**）由 `desktopActIsSensitive` 硬编码保护，任何桌面动作强制人工审批，白名单或会话允许一律不得跳过。**不包含** Finder / Windows Explorer。
- 视觉感知透视回显仅在前端测试或设置中按需预览，截屏缩略图不进大模型文本上下文。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- §3.6 诚实闸：`packages/agent-core/src/computer-use/desktop-act-honesty.ts`（`refuseBareDesktopCoord` / `denyBareDesktopCoordApproval` / `sanitizeDesktopActFailure`）；稳定码 SoT `@enjoy-agents/ipc-contract/desktop-act-codes`；SDK `tool-output-denied` → `mapStreamPart` 写成 `tool.result.result.code`；执行面 `desktop-session-act.ts`；prefs `desktopAdvancedCoords`
- 宿主：`desktop-session.ts`（无 Electron）；act / 重拍：`desktop-session-act.ts`；医生：`doctor-report.ts`
- helper 身份 / codesign：`executor-identity.ts`；打包签名：`apps/desktop/scripts/codesign-helper.cjs`
- 会话 Allow 表：`packages/agent-core/src/computer-use/conversation-desktop-allow.ts`；run 复制 / write-through：`agent-run-state.ts` / `agent-runner.ts`；归档删除清表：`session-lifecycle.ts`
- 账本 / 冻结 / 重拍匹配：`packages/agent-core/src/computer-use/`
- 闸判断前并观察身份：`desktop-act-observation-gate.ts`（`prepareDesktopActGateInput` / `desktopGrantShouldPersist`）；main 接线 `peekDesktopObservation` → `ApprovalPolicy.lookupDesktopObservation`；父循环与子 Agent 共用 `resolveToolApproval`；落盘闸在 `agent-runner.applyApprovalDecision`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 二次确认数据面：`computer-use/desktop-second-confirm.ts`（#85：记住批准时图 → 审批 args 路径 / data URL；缺图诚实失败）；闸：`packages/agent-core/.../desktop-second-confirm-gate.ts`（stash 同步进 `desktopActAlwaysAsks`，盖住会话白名单）
- 二次确认停靠：`desktop-second-confirm-park.ts`、`repark-desktop-second-confirm.ts`（主循环 / 活泵再停卡，不把码只丢给模型）
- 审批卡：`thread/approval/desktop-approval-card.tsx`（二次确认 reshape 同一张卡 + `desktop-second-confirm-body.tsx`；#84 SoT warn/danger）；默认值 `desktop-approval-choice.ts`；坐标划线 `desktop-approval-choices.tsx`
- 空态桌面 pill：`empty-state/desktop-empty-example.ts` + `empty-state-pills.tsx`（只吃 `useDesktopMentionApps`）
- 失败卡：`thread/desktop-act-failed-card.tsx` / `desktop-act-failed-copy.ts`
- 设置：产品页 `settings/computer-use/`（开关、权限、指针、预览、蓝边、始终允许、高级坐标、试用都在这里）；始终允许名单：`tools/desktop/desktop-always-allow-list.tsx`；高级坐标：`tools/desktop/desktop-advanced-coords-row.tsx`；就绪与一句阻断：`tools/desktop/desktop-readiness.ts`
- 单次口令：`packages/ipc-contract/src/computer-use-slash.ts`；发送 `send-composer-run.ts` 的 `computerUseOnce`
- 视觉感知透视：`settings/tools/desktop/desktop-perception-inspector.tsx`
- 持久簿：`desktop-always-allow-ledger.ts`（prefs `desktopAlwaysAllowAppKeys`）；命中辅助：`persistentAlwaysAllowsDesktopAct`
- 右栏：`right-pane/views/desktop-view.tsx`
- Composer 提及铬：`ai-chat/composer/mentions/desktop/`（`@桌面` / `@应用`、偏置芯片、Explore 诚实）；名单映射 `map-listed-desktop-apps.ts`；IPC `builtinTools.desktopListApps`
- Execute 偏置：`RunAgentInput.desktopBias` → `agent-pump` → `openLocalStream` → `createCodingAgent`；纯函数 `packages/agent-core/src/computer-use/desktop-tool-bias.ts`；发送 `desktopBiasForRun`
- overlay 窗：`resources/overlay/computer-use-overlay.html` + `overlay-preload.js`；窗本体 `screen-overlay-service.ts`；生命周期 `desktop-overlay-chrome.ts`；停手势纯函数 `desktop-overlay-lifecycle.ts`；Explore 门控 `desktop-tool-gate.ts`；可见性纯函数 `desktop-overlay-visibility.ts`
- 工具→run：`active-run-id.ts`（ALS）；`currentPumpingRunId` 在 `agent-run-state.ts`；活泵 / 审批续跑包 `runWithActiveRunId`
- CU-P1-P 通知推导 / 待审批红action：`packages/ipc-contract/src/desktop-notify.ts`（`noticeForAgentEvent` / `deriveRunNotifyKind` / `redactDesktopApprovalNotify`）；main 弹出 `apps/desktop/src/main/services/desktop-notify.ts`
- 敏感旗标：`stampDesktopActSensitiveFlag`（`packages/agent-core/.../desktop-act-app-key.ts`）→ `DesktopActApprovalArgs.sensitive`

## 已知坑

- Chat 用 `hidden` 保活，不会因为打开设置而卸载。电脑操控总开关不能只在 Composer 挂载时读一次。设置页写入后要广播 `enjoy:computer-use-changed`，`useComputerUseEnabled` 据此更新「桌面」芯片和 `@桌面`。工具是否注册仍看 main 当时的 `computerUseEnabled`。
- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。该二进制未签名时设置**不得**绿，只显示「请安装带签名的版本后再试」，并且**不**把辅助功能行显示成「未授权」。真要点击仍须给这份 helper 开辅助功能，或改用签名安装包。徽章和权限行只读 helper；`executor_unsigned` / `executor_identity_mismatch` / 宿主 `hostAccessibility` 不得绿。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过（skip ≠ pass）。§3.2e / H5：设置与文档不得把 Win/Linux 标成可用/available，直至真机 GUI 冒烟。
- `doctor-report` 单测注入 darwin 身份钩子，但 `displaySession()` / `formatDoctorLine` 仍读真实 runner。Ubuntu 无图形会话返回「当前没有图形会话」；Windows / X11 / Wayland 返回「尚未标为可用」。这是 H5 文案，不要改优先级去迁就 darwin 断言。断言 macOS helper 人话时把 `session` 钉成 `macos`。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
- **二次确认卡 UI**：视觉真源 `design/previews/cu-p1-r-second-confirm.html`（#84）。数据面已在 main `#85`；Dock warn/danger 铬已接线。像素只进审批 args，禁止把 data URL 写进模型可见的工具结果。
- **二次确认 × 会话 Allow / 持久簿**：stash 或 `needsSecondConfirm` 必须走 `desktopActAlwaysAsks`，盖住 `desktop_act:<appKey>` / `desktop_act:*` 与簿投影 appKey。主循环 / 活泵仍 **repark**，不把失败只丢给模型。二次确认禁止 `allow_always` 落簿。
- **隐患**：确认 resume 仍带原 `elementId`。`needs_second_confirm` 载荷没有单独的 `nextElementId`；新树上同号控件若已换，执行器应诚实失败，不要假 success。若确认后要点新树里的提示控件，需在载荷补 `nextElementId`，本刀不编造。
- 发版 CI 若没有 `CSC_LINK` / `CSC_NAME`，stage 会留下未签名 sidecar，医生保持不绿。不要把「编过 swiftc」写成已就绪。
- **CU-P1-A 闸命中**：`resolveToolApproval` 顺序是先 peek 观察身份 → 硬每次问 → 会话表 → `persistentAlwaysAllowsDesktopAct`。投影只认裸 appKey；`*` / `desktop_act:*` / pid 丢掉。二次确认禁止写簿、禁止簿跳过 Dock。撤销只清簿，不清会话表。
- **隐患**：模型常只给 `{ action, observationId, elementId }`，裸 input 没有 appName/appKey。若不先 peek 账本再 `desktopActIsSensitive`，「本会话任意桌面」或簿会把 Terminal / 系统设置 / 钥匙串当普通点击放行。正确做法：`prepareDesktopActGateInput` 观察身份覆盖模型字段；`peek` 空则 `unresolvedObservation`，`sessionAllowsDesktopAct` / 持久簿不得命中，闸直接 `user-approval`（Dock）。禁止把未解析号当已放行再指望执行面 `stale_observation`。
- **CU-P1-36 坐标通道**：`desktopActIsBareCoord` 认任一 `x`/`y`/`x2`/`y2`，**不因 elementId 放行**。`normalizeActInput` 仍会把坐标转给执行器，所以审批闸与 `actOnce` 必须共用此谓词。缺省 OFF 是 `denied` + `code=bare_coords_disabled`（闸决策与 `tool.result.result.code` 同一常量）；ON 走 `desktopActAlwaysAsks` + `bypassesSessionAllow`。不要只写英文 `reason` 不带码，renderer 无法画硬拒卡。不要把坐标画成主路径，也不要用失败包里的假观察绕 §3.2a 二次确认。
- **CU-P1-36 高级坐标铬**：产品页已嵌开关，出厂 OFF。打开后每次 Dock 并划掉本会话/始终允许。不要另开第二套遥控器，也不要把坐标画成主路径。
- **子循环不认 allow_always**：`WaitForSubagentApproval` 仍是 `allow | deny | allow_session`。父路径 `applyApprovalDecision` 已写簿后，`toSubagentUserDecision` 把 `allow_always` 折成 `allow`，禁止再写会话表。
- **testid 拆分**：旧 `approval-always` 曾指本会话。现在本会话是 `approval-session`，持久是 `approval-always-app`。testid 在四选一选项上，不要挂到「继续」。不要把旧 testid 接到 `allow_always`。
- **H2 write/hit**：审批层按 `desktop_act:<appKey>` 写入、按 `has("desktop_act:"+appKey)` 或 `has("desktop_act:*")` 命中。不要再 `sessionApprovedTools.add("desktop_act")`，也不要按裸工具名放行。
- **P1-S 错 SoT**：ActiveRun 空 Set 不能当会话记忆；`builtin_tools.anyDesktopSession` 不能当任意桌面。正确做法：会话表 keyed by `sessionId`，run 只拿副本。切会话不清表（policy B）；归档/删除才清。进程退出表没。
- **设置无焦点会话**：开关若仍可拨，UI 看起来已开、main 却因缺 `sessionId` no-op。正确做法：把 `sessionId` 传到 `DesktopAnyDesktopDetails`，无会话则 `disabled` + `anyDesktopNeedSession`。
- 执行器快照目前多半只有 `appName`，`appKey` 回落到规范化应用名；有 `bundleId` / `exe` / AUMID 才优先用。`appKeySource` 记录用了哪一档。
- 控件 `elementId` 是当次 AX 路径下标，不是稳定指针。重拍不得只靠同号 id 自动点；有审批 enrich 的 role/name 时必须对上，否则 `needs_second_confirm`。
- **overlay 生命周期挂点（薄）**：`onAct` 把 ALS / 活泵 runId 传进 `beginDesktopActOverlay`。主进程没有独立 `desktop.act.start` StreamEvent。停手势先熄再 `cancelInFlight` 再 abort **该** runId；未知 runId 才退回活泵 / 全部 ActiveRun。
- **隐患**：执行器协议没有 cancel RPC。硬取消 = 拒绝在途 Promise + `child.kill`（与超时同一条路）。OS 已落下的 click 无法撤回；该 run 已 abort，不再继续 act。helper 未 dispose 时 `onExit` 仍可能重启一次。kill 后 stdin 可能 EPIPE，必须在 helper stdin 上吞掉，否则会打翻 main。Esc 用 `globalShortcut`，三端均可；注册失败则只靠顶栏「停止」。设置预览走同一套铬，约 2.4s 自熄，不是成功 toast。
- **CU-P1-B kai 挂点（list / bias 薄）**：`agent.run.desktopBias` 已接线。Execute 重排已注册的 `desktop_*` + 一行 Prefer；Explore 仍经 `shouldRegisterDesktopControlTools` / `isReadOnlyAgentMode` **不**注册，bias 不能开门。提及 ≠ 放行，不写会话表 / `desktop_act:*` / 持久簿。pid / 空 / 脏键 `sanitizeDesktopMentionBias` 后 `stable=false`，`upsertDesktopAlwaysAllowEntry` 仍拒写。win32 / linux `list_apps` 仍多半只有 `name`（回落规范化名，**不**编造 bundleId）；darwin 已带 `bundleId`。helper 失败时名单空，只留宿主 `@桌面`。
- **隐患**：把 `@电脑` 预填或芯片写回去会和产品锁打架。正确做法：token 固定 `@桌面`，旧 `@电脑` / `@Desktop` 只当别名解析。
- **CU-P1-P 敏感真源**：名单只活在 main `desktopActIsSensitive`（`desktop-act-app-key.ts`）。子串：系统设置 / 偏好设置、钥匙串、密码 / 钱包 / 支付（含 alipay / wechat pay），以及终端类——darwin `com.apple.Terminal` / `com.googlecode.iterm2`（显示名「终端 / Terminal / iTerm2」）；win Windows Terminal（exe / AUMID）/ PowerShell / pwsh / cmd（`cmd.exe` 基名精确匹配，避免 cmdline 误伤）/ Command Prompt / 命令提示符；linux GNOME Terminal / Konsole / xterm / Alacritty / kitty / WezTerm。darwin 优先 bundleId 子串，win/linux 回落规范化名与 exe/AUMID 基名。**不包含** Finder / `com.apple.finder` / File Explorer / `explorer.exe` / 文件资源管理器。renderer 禁止本地再算 `desktopActIsSensitive`。**只有 `args.sensitive === false` 才给本会话/始终允许**；缺字段 / undefined / true / 其它值一律当敏感：默认允许一次、不露会话/始终、警示「这是敏感应用，每次都会问你」。禁止写成「已拦截」。
- **隐患**：`allow_session` / `allow_always` 若只信 renderer 选项、不再算一遍，敏感窗（含模型只给 observationId 的 Terminal）会写进会话表或簿。正确做法：`desktopGrantShouldPersist` 先 peek 并身份再 `desktopActIsSensitive`；敏感 / 未解析观察只执行一次，不落盘。
- **CU-P1-P 通知结束态**：用户停仍是 `run.error` + `USER_ABORT_MESSAGE`（`Aborted by user.`），**不**发 `run.end`。通知层 `isUserAbortMessage` 只认这句（大小写 / 句号不敏感），禁止把 `"The operation was aborted"` / timeout 当成已停止。`run.end` → 已完成；其它 `run.error` → 出错，正文不抄 `message`。
- **CU-P1-P 待审批通知隐私**：只含应用显示名 + 粗动作（点击 / 输入 / 滚动 / 按键 / 移动 / 拖拽）。禁止输入文本、控件名、坐标、截图、「允许」按钮。非 `desktop_act` 仍走泛工具句。
- **CU-P1-P 默认值**：有稳键时 `defaultDesktopApprovalChoice` 返回 `allow_session`；始终允许不再 featured。无 `allow_session`（敏感 / 坐标 / 无键）回落到 `allow`。四枚决策不变。
- **隐患**：`args.sensitive` 缺字段若当普通应用，旧 main / 脏 payload 会露出本会话/始终允许。正确做法：renderer 只认严格 `false`；其余一律敏感卡。
- **隐患**：空态桌面 pill 若写死「备忘录」或首帧吃缓存，会在未授权机器上闪一枚假应用。正确做法：只读 `useDesktopMentionApps` 的真实 `displayName`，且开关+权限都就绪后才画。
