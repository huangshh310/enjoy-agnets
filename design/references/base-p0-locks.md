# BASE-P0 三把短锁 — 首启 / CU Linux / 空对话

> 2026-10-09 · jojo 短锁原文照录 · Luna 预览钉视觉 · 基 main `e46d6c72`  
> Owner：Luna 预览 → kai（路线检测 / 可用性真源 / 草稿落库与回收、删除）→ mike（铬）  
> I3 仍停 · 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。  
> 【视觉真源】[`../previews/base-p0-locks.html`](../previews/base-p0-locks.html)

---

# BASE-P0-1 首启到第一句话

一句话：新用户走完或跳过向导后，要么能说出第一句话，要么清楚知道还差哪一步、点哪里补。

Do

1. 向导加「连一个模型」步（在「安装本机引擎」之后），按真实检测给选项：已登录可对话的外置引擎「用 {引擎} 对话」/ 检测到 Ollama、LM Studio「用本机模型」/「添加 API 密钥」进官方预设表单，保存后回到这步显示已连上 /「以后再连」。
2. 区分引擎和模型：Enjoy 本地是引擎，没连模型就不能对话；不能把「引擎就绪」说成「可以开始」。
3. 末屏诚实：有可对话路线才写「可以开始了」；否则「还差一步：连一个模型」+主钮「去连接」、次钮「先逛逛」。
4. 设置→通用「重新打开入门向导」；搜「向导/入门/引导」命中。
5. 没项目：主区「选一个文件夹开始。Enjoy 只在你选的文件夹里读写。」+主钮「选择文件夹」+可拖入；侧栏「新对话」无项目时导航到此空态，不直接弹系统窗。
6. 无密钥发送：中性/提示色「还差一步：连一个模型，才能发消息。草稿会留着。」+「去连接」；红色只给真错误（密钥无效/网络/额度）。
7. 用词统一「连接模型 / API 密钥」，不再「供应商密钥」。

Don’t：无路线写就绪 · 强制先填密钥 · 自动在家目录建工作区 · 无说明弹系统窗 · 密钥上云

验收：S1-1 全新安装出现「连一个模型」，选项按真实检测 · S1-2 向导里加密钥后显示已连上，末屏可以开始、首条能发 · S1-3 以后再连→末屏「还差一步」· S1-4 设置可重开向导、搜索命中 · S1-5 无项目有说明和「选择文件夹」，新对话不直接弹窗 · S1-6 无密钥非红引导、草稿保留、直达表单

## Luna 视觉说明（P0-1）

**布局。** 不换向导壳。仍是 `SetupGuideDialog` 约 800×540、`grid-rows-[auto_minmax(0,1fr)_auto]`、`GUIDE_INSET_CLASS` 左右 32px、底栏进度点 + 文本「跳过设置」+ 胶囊主钮（`GUIDE_BUTTON_CLASS` `h-9 rounded-full`）。步骤表在 `SETUP_GUIDE_FACE` 的 `engines` 之后插入 `connect-model`，序号改成「第 n 步，共 7 步」。中间步标题居左；介绍 / 完成仍 hero 居中。

**「连一个模型」步。** 选项是**可点行**，复用 `GUIDE_TILE_CLASS`（淡描边圆角），不要新做营销大卡。一行：品牌标（`AgentBrandIcon`）+ 主句 + 一行 mute 说明。按 main 探测露出，不编造：

| 条件 | 主句 | 说明 |
|---|---|---|
| 外置引擎已登录可对话 | 用 {引擎} 对话 | 走你已经登录的 {引擎}，不另存密钥 |
| 探测到 Ollama / LM Studio | 用本机模型 | 本机已在跑，不经过云 |
| 始终露出 | 添加 API 密钥 | 进现有官方预设表单（`#/settings/providers` 那套，见 `p0-add-provider-discover`）；保存后**回到本步**，该行改成「已连上」绿点 |
| 始终露出 | 以后再连 | 文本次级，不是红、不是禁用主路径 |

多条路线同时在：推荐那条描 `accent` 细环，其余可点。**不要**把「添加 API 密钥」做成唯一主钮（Don’t：强制先填密钥）。

**引擎 ≠ 可以开始。** 现网 `ReadySummary` 写「{count} 个引擎就绪 · 浅/深 · 工作区」——引擎就绪不能当对话就绪。末屏 `ReadyMark` 绿勾只在有可对话路线时画；否则改成 mute 圆点，标题换成「还差一步：连一个模型」，主钮「去连接」（回到本步或供应商表单），次钮「先逛逛」（关向导，不造工作区）。有路线才保留现网「可以开始了」+「开始使用」。

**末屏快捷键。** 现网 `ReadyShortcuts` 用裸 `<kbd class="rounded-md border …">`，巡检里像碎裂描边 chip（`⌘` / `,` 各一块直角边）。本锁走 `packages/ui` 的 `Kbd`：`h-6 min-w-6 rounded-full bg-kbd-background`，一组键用 `KbdGroup` 并排，不要自描边矩形。

**默认焦点。** 现网底栏「跳过设置」在 DOM 里先于主钮，焦点环会落在跳过上（已观察）。本锁：主钮 `开始` / `继续` / `开始使用` / `去连接` 进窗即首焦。「跳过设置」保持文本钮，不抢首焦。焦点环是 **1.5px 克制描边**（`outline` + 2px offset，色走 ink / 淡 accent），**不要** 3px 高亮黄/亮 accent 光晕。

**外观昼/夜。** 现网 `AppearanceChoice` 用 `ThemeToggle appearance="sidebar-segmented"` → 手绘卡通 `DayNightToggle`（云、星、日芒）。`ui` spec 已禁标题栏用这套；向导也不要用。本锁：浅/深两枚 **皮肤点格**（对齐强调色 `AccentCell`：18px 圆点 + 短名 + 选中墨线环），或标题栏那套 24px `RiSunLine` / `RiMoonLine` 微钮。不要大号卡通开关。

**介绍三卡。** `IntroPoints` 现网 `grid-cols-3` + `h-full` 把三张卡拉满剩余高度，图下大块空白。本锁：卡**贴内容**，不要 `h-full` 拉伸；图标 + 标题 + 两行说明即可，中间滚动区不必填满。

**外观强调色。** `THEME_ACCENTS` 现网写死英文 `Signal Blue` 等，中文界面被 `truncate` 切成 `Signal Bl…`。本锁走 i18n，中文短名：**信号蓝 / 终端绿 / Claude 琥珀 / 宇宙紫 / 石墨灰**。格子仍是五列色点+名，选中墨线环。名称是否再缩短交 jojo。

**设置 → 通用。** 复用 `SetupGuideReplay` + `SettingsCard` / `SettingsRow`。标题仍「启动引导」；按钮与行题改为「重新打开入门向导」（现网按钮只有「重新打开」）。说明改成「再走一遍连模型、装引擎、外观和打开文件夹。」`settings-catalog-nav` 通用 `keywords` 补 `向导` / `入门` / `引导`，情境栏搜索（`filter-module-nav`）才能命中。

**无项目 / 有项目门（诚实）。** 现网 `ChatStage` 只看 `workspaceId`：没有当前工作区 id 就整面铺白/黑底 + 一句标题「打开工作区」+ 一颗蓝钮「打开文件夹」。侧栏 `SidebarRepos` 已经列出项目时，主区仍当「没项目」——这是谎话。本锁分两态，不要混：

| 侧栏 | 主区 |
|---|---|
| 已有项目 | 指向已有项：「继续在 {项目} 里开始」+ 一句 mute「侧栏已经有这个项目，点继续进开始面。」主钮「继续」。**不要**再问打开工作区。 |
| 一个项目都没有 | 锁文案「选一个文件夹开始。Enjoy 只在你选的文件夹里读写。」+ 主钮「选择文件夹」+ 虚线落区抄 `FolderDrop`（`flex-1 min-h-[168px]` **撑满主区盒子**，不要居中一小块虚线药丸）。 |

「新对话」无项目只 `navigate('#/')` 到对应空态，不直接弹系统窗。反例必须画：侧栏已有 enjoy-agents，主区仍是满幅画布 + 单蓝钮「打开工作区」。

**无密钥发送。** 现网 `needs_key` 走 `ThreadErrorBanner` 红边 `border-border-error-default` +「还没有可用的供应商密钥」。本锁：改走 `ThreadNoticeBanner` 那路——描边 `line`、黄点或 accent 点、**不是红底**；文案钉锁；动作「去连接」进预设表单；`composer` 不清。密钥无效 / 网络 / 额度仍用红错误卡。用词「连接模型 / API 密钥」，界面与 banner 不再出现「供应商密钥」。

**复用。** `SetupGuideDialog` / Header / Footer / `EngineInstallList` / `AppearanceChoice`（昼/夜改皮肤点或 `TitleBarToggles` 24px，不要 `DayNightToggle`）/ `WorkspaceChoice` `FolderDrop` / `ReadySummary` + `Kbd` / `SetupGuideReplay` / `ThreadNoticeBanner` / `ThreadErrorBanner` / `ChatStage` 空态（有项目继续 / 无项目落区）/ 供应商预设表单。不新开第二套向导、不新 modal。

---

# BASE-P0-2 电脑操控在 Linux 上诚实

一句话：能不能用，一句人话说清；不能用就不假装。

Do

1. 可用性以 main 为真源（执行器身份/`desktop_doctor`），四态：可用 / 需要授权 / 这台电脑暂不支持 / Beta 验证中；renderer 不自判。
2. 不支持：开关禁用 + 原因（如「这台电脑还不能用电脑操控：缺少操控组件。Linux 支持仍在验证中。」），不再裸「无执行器」。
3. 不可用时无「桌面」chip、无 `@桌面/@应用`；手写 `/computer-use` 回人话、不注册桌面工具。
4. 「检测权限」2 秒内出结果，有加载态。
5. 开关描述跟状态走。
6. 「尚未在真机上验收」→「Beta：这个平台还在验证中，可能不稳定。」
7. 对齐 §3.2e / CU-P0-A。

Don’t：无执行器开关保持开 · 先给 @桌面 再在执行时失败 · 内部名（`desktop_list_apps`/`desktop_*`/「同源」「插件店」）· renderer 自写平台名单 · 放宽审批

验收：S2-1 无执行器开关禁用+人话 · S2-2 无 chip、@ 无桌面项、`/computer-use` 有说明 · S2-3 检测 2 秒出结果 · S2-4 开/关描述正确 · S2-5 macOS 已授权行为不回退 · S2-6 无内部名/开发备注

## Luna 视觉说明（P0-2）

**布局。** 不换设置页。仍是 `#/settings/computer-use`。现网巡检：`ComputerUseOperations` 一张卡里把「始终允许的应用 / 高级坐标 / 本会话任意桌面 / 检测权限」叠成**等权标题**，顶卡四态看不出主次。本锁四态画在**同一张主卡**里，层级固定：

1. **顶：状态 + 总开关** — 标题「电脑操控」+ 四态徽章 + 主 Switch + 跟态走的描述。这是第一眼。
2. **中：检测权限行** — 一行次级：权限摘要（辅助功能 / 屏幕录制 / 输入监听，或 Linux 人话）+「检测权限」描边钮。不是第三张等权大卡标题。
3. **底：高级（视觉降权）** — 小节头写「高级」caption，收「始终允许的应用」名单空态 +「高级坐标」（少用徽章、默认关）。字号/对比低于顶段，不要再跟顶段同级 `text-body-medium` 标题。本会话任意桌面也进这一段，不要跟总开关抢权。

深色：卡描边必须看得见。现网 `--line #2C343C` 贴 `--card #1C2127`，边几乎溶掉。本预览深色 `--line` 提到约 `#3F4A55`，和 card 至少一眼能分开。四态只改徽章 + 开关 disabled + 描述，不另起平台专页。

**四态铬（main 下发，renderer 不写死 darwin/linux）。**

| 态 | 徽章 | 开关 | 描述（跟态走） |
|---|---|---|---|
| 可用 | 绿「可用」 | 可拨 | 开：本机看屏、点选、打字。关：普通发送不带桌面工具。 |
| 需要授权 | 黄「需要授权」 | 可拨（可开着等授权） | 还差系统权限。点「检测权限」或打开下面未授权的那一项。 |
| 这台电脑暂不支持 | mute「暂不支持」 | **禁用、保持关** | 这台电脑还不能用电脑操控：缺少操控组件。Linux 支持仍在验证中。 |
| Beta 验证中 | 黄「Beta 验证中」 | **禁用、保持关**（未冒烟） | Beta：这个平台还在验证中，可能不稳定。 |

现网徽章 `无执行器` / `未签名` / `未授权` / `未确认` / `无桌面`、文案「尚未在真机上验收」「还不能点击。本机还没有桌面执行器。」全部让路给人话。C 端不出现 `desktop_*`、`executor_missing`、同源、插件店。

**检测权限。** 复用 `ComputerUseAccess` 的 loading 相。按钮旁转圈或行内「正在确认…」，**2 秒内**换成四态之一；不要无限「检测中」。现网 `checking` =「正在确认即将启动的执行器…」可缩成「正在检测权限…」。

**Composer / @。** `ComputerUseChip` 现网只看「开关开 + 执行态」。本锁再加 main 可用性：不可用则底栏无「桌面」芯片。`mentions/desktop/` 整组不挂——`@` 面板仍是文件 / 文档 / 技能 / MCP / 网页 muted，**不要**划掉桌面行（划掉=还在教它存在）。手写 `/computer-use`：助手一条人话泡（`ThreadNoticeBanner` 或普通助手句），例如「这台电脑还不能操控桌面。Linux 支持仍在验证中。」不注册桌面工具、不进 Dock。

**macOS 已授权（S2-5）。** 预览单独画「可用」+ 权限三行已授权 + 底栏「桌面」芯片 + `@` 仍有桌面组，避免实现时把 macOS 一并禁用。

**复用。** `ComputerUseSwitch`（顶：状态+总开关）/ `ComputerUseAccess` 收成检测权限行 / `ComputerUseOperations` 降到「高级」/ `ComputerUseChip` / `mentions/desktop` 门闩 / `ThreadNoticeBanner`。不新遥控器、不放宽审批四选一。不把操作四块做成等权标题。

---

# BASE-P0-3 空对话

一句话：没说过话的对话不留在列表里；用户能删掉不要的对话。

Do

1. 「新对话」打开草稿视图；发出第一条消息（或加了第一个附件）才落库、进侧栏和看板；离开未动草稿即丢弃。
2. 反复点「新对话」复用同一未动草稿。
3. 启动时回收「零条用户消息、无旗标、未改过工作流状态」的存量空会话；有内容或标记一律保留。
4. 看板「+ 新建」开草稿（可选标题），保存/发送才出卡，可取消。
5. 会话菜单加「删除」+二次确认「删除这个对话？删除后无法恢复。」，与「归档」区分清楚。
6. 「…」菜单贴着所点行弹出。

Don’t：自动删有内容/有标记的会话 · 删除不确认 · 影响 fork/heartbeat/自动化会话 · 上云

验收：S3-1 连点 5 次新对话不增会话 · S3-2 发一条后出现在侧栏与看板待办 · S3-3 升级后存量空会话消失、有内容/标记的保留 · S3-4 看板新建可取消 · S3-5 删除有二次确认且三处同步消失 · S3-6 菜单贴行

Owner：Luna 预览 → kai（路线检测 / 可用性真源 / 草稿落库与回收、删除）→ mike（铬）。

## Luna 视觉说明（P0-3）

**草稿视图。** 复用空会话开始面 `EmptySessionStart`（问候 `text-title-1-bold` + Composer + pills），**不要**新开「未保存」营销页。侧栏会话树**不出现**「新对话」行；顶栏可以仍写「新对话」当标题。现网 `startPersistedSession` → `createAndOpenSession` 会立刻落库；本锁改走类似 `showEmptyHistoryChat` 的前台空会话，第一条用户消息或第一个附件才 `createAndOpenSession`。连点「新对话」只聚焦同一草稿，侧栏张数不变。

**看板。** 现网 `ColumnNewButton`「新建」立刻 `createAndOpenSession` + `dropSession`。本锁：待办列底出现一张**虚线草稿卡**（不是 `KanbanCardView` 实卡）：可选标题输入、主钮「开始」、次钮「取消」。取消拿掉草稿卡、不落库；开始/发送才变成实卡并进侧栏。

**… 菜单。** 复用 `SessionRowMenu`（旗标、状态、归档）。在归档下加分隔线，再放「删除」——`text-danger`，与 mute 的「归档」分开。`DropdownMenuContent` `align="end" side="bottom"` **贴该行 `…`**，不要挂到情境栏顶或视口中央（已观察会漂）。

**删除确认。** 复用 `ConfirmDialog`（`rounded-3xl`、`destructive` 主钮）。标题+说明钉锁文：「删除这个对话？删除后无法恢复。」主钮「删除」，次钮「取消」。不要 `window.confirm`。归档页旧文案「确定永久删除这条会话？」活会话菜单不用。删完：侧栏行、看板卡、若正在看则回到草稿空态，三处同步。

**回收。** 启动清「0 条用户消息 + 无旗标 + `workflowStatus` 空」的存量。预览画升级前三条空「新对话」+ 一条旗标空会话 + 一条有内容；升级后只留后两条。fork / heartbeat / 自动化会话不在回收名单（Don’t）。

**复用。** `EmptySessionStart` / `showEmptyHistoryChat` / `SidebarSessionRow` / `SessionRowMenu` / `KanbanColumn` / `ConfirmDialog`。不上云、不新会话库 UI。

---

## 巡检记（折进预览，不另开锁）

对照实码 `e46d6c72`，实现时顺手或单独立项，预览里画在对应节：

1. **「环境」卡挡住 @ 菜单。** `EnvironmentPanel` `absolute top-2 right-2 z-20 w-72`，空会话也挂着；`@` 发现面板从 Composer 向上/向下展开会被盖住。建议：mention 打开时先收环境卡，或把环境卡降到不盖面板的 z。**请 jojo 是否并进本刀。**
2. **「无分支」×「未检出分支」。** 环境卡 `environmentNoBranch` =「无分支」；底栏 `gitNoBranch` =「未检出分支」。同一事实两套词。建议统一「未检出分支」。
3. **引擎计数两套数。** 向导 `engineSummary`「{ready} 个就绪 · {missing} 个未安装」只数 `composerAgentTabs`；设置本机 CLI 页另有「未安装 N 个」。巡检见「12 个未安装」对「未安装 20 个」。**给 kai：一个真源。**
4. **无项目门说谎。** 侧栏已列出项目时，`ChatStage` 仍因没有 `workspaceId` 画满幅白/黑底 + 单蓝钮「打开工作区」。诚实门：有项目指向「继续在 {项目} 里开始」；无项目才是锁文案 + 撑满盒子的落区。反例见 S1-5 / P0-1 Don’t。
5. **向导末屏 kbd 碎裂。** `ReadyShortcuts` 裸边框 `<kbd>` 看起来像坏掉的 chip。改走 `Kbd` 胶囊 token。
6. **向导昼/夜卡通。** `AppearanceChoice` 的 `DayNightToggle` 与强调色点格、标题栏 24px 太阳/月亮不是一套皮。向导改皮肤点或标题栏微钮。
7. **主钮焦点过亮。** 现网 / 旧预览 3px accent 光晕发黄发跳。改 1.5px 克制 outline。
8. **电脑操控等权堆叠。** 操作卡把始终允许 / 高级坐标 / 任意桌面 / 检测权限做成同级标题。四态主卡要：顶状态+总开关 → 检测权限行 → 高级降权。
9. **深色卡边溶掉。** `--line` 太贴 `--card`。预览加深描边，落地时 token 也要一眼能看见边。

---

## 对照 main `e46d6c72`（现在代码，不是落地后）

| 面 | 今天实际 |
|----|----------|
| 向导步 | `intro → capabilities → engines → appearance → workspace → ready`，无「连一个模型」 |
| 末屏 | 标题恒「可以开始了」；摘要「N 个引擎就绪」；不看有没有可对话模型 |
| 焦点 | 底栏先渲染「跳过设置」文本钮，再渲染主钮 |
| 介绍三卡 | `IntroPoints` `h-full` 拉满，卡内大块空 |
| 强调色名 | `THEME_ACCENTS[].name` 英文；`zh/common.ts` 的 `signalBlue` 也是 `"Signal Blue"` |
| 重开向导 | 通用有 `SetupGuideReplay`，按钮「重新打开」；keywords 无向导/入门/引导 |
| 无项目 / 门 | `ChatStage` 只认 `workspaceId`：无 id 就满幅「打开工作区」+ 蓝「打开文件夹」，侧栏已有项目也这样；「新对话」无项目会弹系统窗 |
| 无密钥 | `ThreadErrorBanner` 红卡 +「供应商密钥」 |
| CU 页层级 | 顶卡开关不因缺执行器禁用；徽章「无执行器」；Linux「尚未在真机上验收」；操作卡等权堆始终允许 / 高级坐标 / 任意桌面 / 检测权限；深色 `--line` 贴 card |
| CU chip / @ | chip 只看开关+执行态；`@` 桌面组在 CU 开时挂上 |
| `/computer-use` | `takeComputerUseSlash` 给这一发注册桌面工具 |
| 新对话 | `startPersistedSession` 立刻 `createAndOpenSession`，侧栏立刻多一行 |
| 看板新建 | 立刻建会话并丢进该列 |
| 会话菜单 | 旗标 / 状态 / 归档，**无删除**；删除只在设置「已归档的聊天」 |
| 环境卡 | 空会话也 `absolute` 浮在右上，默认开 |

Token：本预览用 Agents `ink #0F1419` / `mute #5C6670` / `line #E4E7EB` / `paper #F7F8FA` / `card #FFFFFF` / `accent #2B6DE5`，加 light / dark 切换。不要抄 I4 旅行纸色。

---

## 需要 jojo 拍板

1. 强调色五中文名是否用「信号蓝 / 终端绿 / Claude 琥珀 / 宇宙紫 / 石墨灰」，还是再短（蓝 / 绿 / 琥珀 / 紫 / 灰）。
2. 多条可对话路线同时在时，默认推荐：已登录引擎 > 本机模型 > 添加密钥——是否就这个顺序。
3. 末屏无路线的次钮用「先逛逛」还是沿用「跳过设置」。
4. 「环境」卡挡 @ ：是否并进本刀（Luna 建议并，改动小）。
5. 看板草稿空标题回退「新对话」，还是强制起名。

---

*冲突以 `design/specs/*` 为准。未落地前：视觉与文案以预览 + 本文为准。落地后回写 ui / settings / computer-use / workspace 当前真相。不宣称应用已 1:1。不碰 I3。*
