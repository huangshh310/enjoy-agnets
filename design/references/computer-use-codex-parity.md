# Enjoy Computer Use × Codex 对标缺口

> 产品短稿 · Enjoy Agents（local-first 多 CLI ACP 宿主）  
> 落点：`/workspace/enjoy-docs/computer-use-codex-parity.md`  
> 对照 tip：`86228f9` feat(computer-use): native executors（已用 `gh` 私仓核对）  
> 研究日：2026-09-25（Asia/Shanghai）  
> **修订**：并入 leo 预审（TTL×审批 / 会话 Allow 绑 App）+ kai 摸底（darwin codesign、resume 账本、Win/Linux 冒烟门）  
> 锁：local-first · 无假 BYOK · 无 worktree 舰队 · Registry≠插件店 · Skills/MCP 宿主 SoT · CU 走宿主 builtin + Approval Dock / Explore-Execute 诚实

---

## 0. 一句话结论

**Codex「Computer Use」卖的是：开插件 → 授 OS 权限 → `@Computer`/`@App` 开干 → 按应用审批 → 前台看得见、失败说得清。**  
Enjoy tip `86228f9` 已具备**宿主侧原生执行器 + AX 观察账本 + `desktop_*` builtin**，工程骨架领先多数开源；用户体感仍不像 Codex，缺口主要在**开通闭环、按应用门禁、可见操控态、以及「模型能看见再动手」的完成度**，不是再造一套坐标 API。

---

## 1. 竞品 / 开源对照表

| 维度 | OpenAI Codex / ChatGPT CU | Claude Code / Cowork CU | Anthropic API CU Demo | OpenHands + browser-use | Enjoy（tip `86228f9`） |
|------|---------------------------|-------------------------|-----------------------|-------------------------|------------------------|
| **开通** | Plugins → Install Computer Use → 开 MCP/Skill 开关 → Try now；macOS 录屏+辅助功能；Windows 目标窗可见 | Desktop：Settings → Enable；CLI：`/mcp` 开 `computer-use`（按项目持久）；OS 权限 | 自建循环：声明 `computer_toolset_*`，自备沙箱 | SDK 挂 `BrowserToolSet`；Docker+VNC 可看 | 设置开关 → 注册五工具；`desktop_doctor` 写缺什么。**缺「装完即试」向导与 `@App` 入口**（产品层） |
| **工具面** | 看屏 + 点/打/滚/键/剪贴板；`@Computer`/`@AppName`；优先结构化插件 | 点/打/滚/截屏；工具优先级 MCP→Bash→Chrome→CU；按应用能力分档（浏览/交易只读等） | `screenshot`/`left_click`/`type`/`scroll`/`key`/`zoom`…（像素坐标） | 浏览器 DOM/CDP：navigate/click/fill；非本机全桌面 | **AX 树优先**：`desktop_doctor` / `desktop_list_apps` / `desktop_snapshot` / `desktop_screenshot` / `desktop_act`；`act`∈click/move/drag/scroll/type/key/wait。截图**不进模型文本**（给人看） |
| **审批** | 按应用 Allow / Always allow；敏感动作再问；与文件/shell 沙箱分离 | 按会话按应用 Allow/Deny；高风险应用哨兵警告；Esc 全局停 | 应用侧自建确认 | 视宿主；沙箱隔离为主 | `desktop_act` 默认进 Approval Dock；`wait` 免批；坐标/`allowForeground` **每次问且不吃会话白名单**。**缺 Always-allow 应用名单 UI** |
| **观察 / 账本** | 任务中可见操控；移动端远程看截图/终端、批批准 | 隐藏未批应用；终端窗排除截屏；结束自动还原 | 每步截屏回传模型 | VNC 旁观；browser 工具事件 | 观察编号 host 签发，**30s TTL / 用过即废**（`OBSERVATION_TTL_MS`）；失败码可还观察；右栏 Desktop 只读最近窗+缩略图；审批卡可带拇指图 |
| **失败诚实** | Win 前台独占写进文档；不能自动化终端/自身；EEA/UK/CH 不可用写明 | 锁被占、权限、计划不可用均有明确文案 | 工具 `is_error` + batch halt | 沙箱/端口失败可见 | 错误码：`needs_foreground` / `permission_denied` / `integrity_blocked` / `executor_missing` / `stale_observation` / `unknown_key` / `no_display` / `screenshot_unavailable` / `action_failed`…；**未授辅助功能禁止伪装成前台许可**（spec 不变量） |
| **运行形态** | macOS 可后台/Locked use；Win **前台接管**；可手机舵 | macOS 15+ 默认可后台；可切 Full control | 通常 Docker/VM | 容器内浏览器 | 附属进程 JSON-RPC；darwin Swift AX / Linux AT-SPI / Win UIA；Wayland **不发明后台点击** |

**「像 Codex」在本地 Electron Agent IDE 里的实务含义**

1. **一键开通闭环**：开关 → OS 权限 → doctor 绿 →「试一下」示例任务，而不是「开了但不知道能不能点」。  
2. **自然语言点名应用**：`@Calculator` / 「用桌面打开…」即走 CU，不必先教模型背工具名。  
3. **按应用门禁 + 可撤销 Always allow**（与 Explore/Execute、文件审批分层）。  
4. **人随时看得见、停得了**：操控态边框/右栏实时窗 + Esc/停一手势。  
5. **失败不装成功**：权限、前台、无显示、执行器缺失，文案进审批卡与会话。  
6. **宿主 builtin，不依赖各 ACP CLI 自带 CU**（Codex 是自家 app；Enjoy 是多引擎宿主）。

非含义（勿追）：Codex 插件市场、Locked use、手机远程舵、worktree 并行舰队、把 CU 做成 Registry 插件。

---

## 2. Enjoy 缺口清单

> 已对 tip `86228f9` + `design/specs/computer-use.md` + `native/.../protocol.md` + `desktop-tools/session` 核对的标 **[已核实]**；其余标 **[假设/待核]**。

### 2.1 产品体验（对用户「用不了像 Codex」）

| ID | 缺口 | 状态 | 说明 |
|----|------|------|------|
| G1 | 开通不像「Install → Try now」 | **[假设/待核]** UI | tip 有设置开关 + doctor 文案；未见 Codex 级插件安装页、Try now、`@Computer` composer 入口。需核设置页与 composer mention。 |
| G2 | 无持久「Always-allow 应用」管理 | **[假设/待核]** | 现有：单次/`desktop_act` 审批 + 会话白名单策略（坐标/前台绕过）。缺 Settings 里可撤的应用白名单（Codex `$CODEX_HOME` / UI 对标）。 |
| G3 | 模型「看不见」像素 | **[已核实]** | `desktop_screenshot` 明确：**图不回模型**；点击依赖 `desktop_snapshot` AX。相对 Codex/Claude「截屏进模型」是架构分叉——可保留 AX-first，但要补**人眼可见闭环**与可选「缩略图进多模态」策略（P1）。 |
| G4 | 操控态不够「正在用电脑」 | **[已核实部分]** | 有 `computer-use-overlay.html`、右栏 `desktop-view`；是否默认在 `act` 时点亮、Esc 全局停、系统通知——**[待核]** 与 Codex/Claude 对标仍弱。 |
| G5 | Explore 下完全不注册 CU | **[已核实]** | spec：探索模式不注册。诚实，但用户从 Explore 切 Execute 时需能力轨提示「桌面控制仅 Execute」——**[待核]** copy。 |
| G6 | 跨端真实 GUI 验收不足 | **[已核实]** | spec 已知坑：Win/Linux 真机点击未在 mac 开发机验收；`ENJOY_CU_GUI=1` 跳过≠通过。 |
| G7 | 签名二进制 vs 开发 `swiftc` 权限错位 | **[已核实]** kai | darwin `swiftc` 产出**无 codesign**；医生读 **Electron** AX，真点击走**子进程** AX → 医生绿、点击仍 `permission_denied`（「不如 Codex」同因）。 |
| G12 | 审批停靠 × 观察 30s TTL | **[已核实]** leo | 用户慢批 / `resumeDesktopAct` → 易 `stale_observation`，「点了允许却没点上」。 |
| G13 | 重启后观察账本纯内存 | **[已核实]** kai | 进程重启后 resume **必 stale**；不得假放行。 |
| G14 | 会话 Allow 过宽 | **[已核实]** leo | `sessionApprovedTools` 若只含裸 `desktop_act`，任意 app element 可自动放行。 |

### 2.2 能力面（对「能操作」）

| ID | 缺口 | 状态 |
|----|------|------|
| G8 | 无 Codex 级「应用插件增强」（Chrome/Excel 扩展） | **[已核实]** 仅原生 AX；浏览器应继续走 Enjoy 内置 browser / MCP，不塞进 CU |
| G9 | 像素点击是逃逸舱而非主路径 | **[已核实]** 坐标每次审批；与「AX 编号」双轨需产品文案讲清 |
| G10 | ACP 外置引擎（Codex CLI / Claude Code）不自动获得本机 CU | **[假设/待核]** tip 注入在 Enjoy Local builtin；外置 ACP 是否暴露同工具或仅 Local——**产品需锁：CU SoT 在宿主** |
| G11 | 无移动端远程审批/旁观 | **明确非目标（P0）** |

### 2.3 已有优势（勿当缺口重做）

- 宿主 native 三端执行器 + 换行 JSON 协议。  
- 观察账本 TTL/单次消费 + 失败还观察。  
- `permission_denied` ≠ `needs_foreground` 诚实分码。  
- Approval Dock 复用；渲染进程不截屏、不发鼠标。  
- Explore 不装枪——符合 Enjoy 诚实模式。

---

## 3. P0 产品短锁

### Do

- **CU = 宿主 builtin tools**（Enjoy Local），走现有 Approval Dock；不进 Registry、不做「CU 插件店」。  
- **开通三拍**：设置开 → OS 权限（辅助功能/录屏）→ `desktop_doctor` 一句人话 → Composer「试一下」预设。  
- **Execute 才注册**；Explore 明示「桌面控制需 Execute」。  
- **默认 AX**：`snapshot` → `act(elementId)`；坐标/`allowForeground` 始终单独亮审批。  
- **失败码原样露出**给用户与模型；doctor 绿才能默示「能点」。  
- **右栏 + overlay**：有观察/在 act 时显示「正在看的窗口」；一键停。

### Hard locks（leo + kai · 必须进验收）

> 入库/设计对齐用正式章节号：**§3.2a**（TTL）、**§3.2b**（appKey）、**§3.6**（P1）。H3–H5 为 kai 补充，同属 P0/P1 硬锁。

### 3.2a 审批停靠 vs 观察 30s TTL（leo P0 · 钉死）

> **钉死句**：待批冻结 TTL；放行后仍 stale → 自动重拍一次→校验 app/element→再 act；禁对过期观察直接点；验收覆盖「审批>30s」与「重启后允许 / resumeDesktopAct」。

**锁（组合，禁止只加长 TTL）**：

1. **停靠冻结**：PermissionDock / 待批期间，**冻结**该次观察 TTL（时钟不计时）。  
2. **放行后若仍 stale**（超时边界、进程重启、`resumeDesktopAct`、观察丢失）：**自动重拍观察一次** → 校验同 `appKey` + 同 element 稳定键（若有）→ 通过再 `act`；校验失败 → **二次确认**（新旧缩略图摘要），禁止静默点错窗。  
3. **禁止**：对过期观察直接 click；禁止空成功。

**验收**：

- **3.2a-A**：审批卡停留 **>30s** 再允许 → 动作落到原目标或诚实失败（不得 stale 静默）。  
- **3.2a-B**：**重启 / resumeDesktopAct** 后再允许 → 走「重拍→校验→act 或二次确认」。

### 3.2b 会话 Allow 绑 appKey（leo P0 · 钉死）

> **钉死句**：Allow 绑 appKey（`bundleId` → `exe`/AUMID → `appName`）；禁裸 `desktop_act` 全屏放行；「本会话任意桌面」高级开关默认关。

1. 白名单键优先级：`bundleId`（mac）→ `exe` / AUMID（win）→ 规范化 `appName`；`pid` 仅辅助，**不得**单独作 Always-allow 键。  
2. 会话允许形态：`{ tool: desktop_act|type|key|…, appKey }`。允许 A ≠ 允许 B。  
3. **禁**裸 `desktop_act`（无 appKey）作为会话级全屏自动放行。  
4. 「本会话允许任意桌面点击」：**默认关**；仅高级开关 + 警示文案（「将跳过按应用确认，可点击当前屏幕上任意窗口」）；未开时禁裸 `desktop_act` 会话级放行。  
5. 敏感窗（系统设置 / 钥匙串 / 支付）即使开了任意桌面仍每次问（能识别则拦）。

**验收**：允许 App A 后点 App B 必须再批（未开任意桌面时）；Always-allow 列表可撤销。

### 3.2c darwin 打包 helper codesign（kai P0 · 原 H3）

1. **stage / 发布包**必须对**当前真实执行器**做 codesign（及团队既定公证流程）；开发 `swiftc` 临时二进制不得冒充「已就绪」。  
2. **`desktop_doctor` 校验「当前执行器身份」**（签名/路径/与将要 spawn 的 helper 一致），不得只查 Electron 宿主 AX。  
3. 医生绿 **当且仅当** 即将执行点击的那条进程链路也可过 AX；否则人话指向「为 Enjoy Computer Use helper 开辅助功能 / 重装签名包」。

**验收**：签名错位场景下医生**不得**绿；或绿了则真实 click 不得再 `permission_denied`（同一权限画像）。

### 3.2d 重启 resume（kai P0 · 原 H4）

1. 观察账本若纯内存：重启后任何 `resumeDesktopAct` **必须**显式 `stale_observation`（或等价），走 H1 重拍路径。  
2. **禁止**假放行（UI 显示已允许但未 act / 静默吞错）。  
3. 失败文案进入审批卡与会话，模型侧同错误码。

### 3.2e Win/Linux 可用性门（kai · P1 / 发布硬门 · 原 H5）

未做真机 GUI 冒烟前，设置/文档不得标该平台「可用」；`ENJOY_CU_GUI=1` 跳过 ≠ 通过。P1 切片 CU-P1-D。

### Don’t

- 假 BYOK / 云端代操本机桌面。  
- worktree 舰队、多桌面远程机农场。  
- Registry 卖 CU；Skills/MCP 宿主 SoT 被 CU「旁路商店」抢走。  
- 在 TS 里用 cliclick / AppleScript / xdotool / SendInput 绕执行器（spec 已禁）。  
- Wayland 上假装支持后台点击。  
- 把截屏默默喂给模型却不在 UI 声明（若做多模态，需显式开关）。  
- 追 Codex Locked use / 手机舵 / 地理围栏复制。

### Acceptance（P0）

1. 用户从零：打开 Computer Use → 按 doctor 授权限 → 「试一下」能对**系统计算器或文本编辑器**完成：列出应用 → 快照 → 审批 → 点击 → 右栏看到窗。  
2. 未授辅助功能：会话与审批卡出现 `permission_denied` 人话，**零点击**。  
3. Explore：工具列表无 `desktop_*`；切 Execute 后出现。  
4. `stale_observation` / 过期编号：不点击并提示重拍。  
5. `needs_foreground`：观察可还；用户允前台后同号可重试。  
6. **§3.2c**：打包执行器 codesign；doctor 校验当前执行器身份，与真实点击权限画像一致（修 G7）。  
7. **§3.2a-A**：审批停留 **>30s** 再允许仍可点或诚实失败。  
8. **§3.2a-B / §3.2d**：重启后 `resumeDesktopAct` → 显式 stale → 重拍路径；禁假放行。  
9. **§3.2b**：会话 Allow 绑 `appKey`；允许 A 后点 B 再批。

### Luna 一句话视觉方向

> **「权限坞里的桌面名片」**：审批卡左侧是窗缩略图+应用名+控件名，右侧 Allow / 始终允许**此应用** / 拒绝（勿画裸「允许桌面工具」）；可加一态「观察已过期 → 重拍确认」；右栏同名片只读；act 时屏幕一圈冷静蓝边呼吸——像 Codex 的「它在用电脑」，但信息架构仍是 Enjoy 的 Approval Dock，不是第二套遥控器。设置里 doctor 标明**当前 helper 签名状态**。

### 3.6 P1 表态（可下刀 / 记债）

| 项 | 表态 | 处置 |
|----|------|------|
| Ledger 分桶 | 按 **session** 分桶（对齐 M-D）；禁全局单桌面永续糊一条 | P1 下刀（宜随 CU-P0-C） |
| `action_failed` 不还观察 | 失败不得附「像成功下一步」的新观察；需新观察须显式再 `snapshot`/`screenshot` | 写入 specs（P0 文案债 / P1 实现） |
| 坐标通道 | 默认 **禁**裸坐标 click；优先 AX element；坐标仅高级/调试 | P1 下刀（默认关） |
| type / key 与 Allow | 与 click 同绑 `appKey`（见 §3.2b）；「任意桌面」同样覆盖并明示 | 行为对齐 §3.2b |

---

## 4. 明确非目标

- Codex 插件生态、Computer Use 作为可卸载 plugin 包格式。  
- macOS Locked use / 授权插件解锁。  
- ChatGPT 手机远程舵 Windows。  
- 像素-first 全桌面 CUA 取代 AX（P0 不翻架构）。  
- 为每个 ACP CLI 各实现一套 CU。  
- OpenHands 式 Docker 桌面沙箱默认（可 P2 研究；非 local-first 主路径）。  
- 交易/银行类应用默认放行；管理员提权窗自动化。  
- 团队策略云同步 Always-allow（可后置；P0 本机名单即可）。

---

## 5. 建议切片（luna → mike → kai，无实现）

### P0（对齐「能用得像 Codex」的最小闭环）

> **实现序（产品确认）**：`CU-P0-D` → `CU-P0-B` → `CU-P0-A`；`CU-P0-C` 可与 B 并行薄做。


| Slice | Owner 序 | 内容 | 验收锚点 |
|-------|----------|------|----------|
| **CU-P0-A 开通与诚实** | luna → mike → kai | 设置页文案 + doctor 人话 + 权限深链；Explore/Execute 能力轨；**§3.2c codesign / doctor=执行器身份**（G7） | Acceptance 1–2, 6 |
| **CU-P0-B 审批名片** | luna → mike → kai | Dock 桌面卡；**§3.2b 绑 appKey**；可选「本会话允许此应用」；禁默认裸 `desktop_act` | Acceptance 1, 3–5, 9 |
| **CU-P0-C 可见操控态** | luna → kai（薄） | overlay 在 act 生命周期点亮；右栏 Desktop 与卡同步；空态文案 | 「正在用电脑」可感知 |
| **CU-P0-D TTL×停靠 / resume** | kai → mike | **§3.2a 冻结 TTL + stale 重拍**；**§3.2d 重启显式 stale、禁假放行** | Acceptance 4, 7–8 |

### P1（对标加深，仍不撞锁）

| Slice | 内容 |
|-------|------|
| **CU-P1-A Always-allow 应用簿** | Settings 可撤名单；与 `desktopActBypassesSessionAllow` 策略对齐；坐标/前台仍每次问 |
| **CU-P1-B Composer `@桌面` / `@应用`** | 提及即偏置工具选择；非插件市场 |
| **CU-P1-C 可选缩略图进多模态** | 显式设置；默认关；声明隐私 |
| **CU-P1-D Win/Linux 真机 GUI 闸（§3.2e）** | 真机冒烟前不得标「可用」；`ENJOY_CU_GUI=1` 跳过≠通过；进发布门禁 |
| **CU-P1-E 外置 ACP 策略声明** | 文档+UI：CU 仅 Enjoy Local builtin / 或经宿主桥只读暴露——二选一写死 |

### 给三角色的交接一句

- **luna**：先画「开通三拍 + 审批名片 + 蓝边 overlay」，别画第二套远程桌面。  
- **mike**：锁 G1/G2/G10 的产品句；P0 不接 Always-allow 持久化也可，但要在稿里写「故意延后」。  
- **kai**：P0 优先 **§3.2c 签名+doctor 身份**、**§3.2a/§3.2d TTL×resume**、审批卡数据面与观察还码；勿重写执行器协议。

---

## 6. 研究附录（来源）

| 来源 | 用途 |
|------|------|
| tip `86228f9` · `design/specs/computer-use.md` · `apps/desktop/native/computer-use/protocol.md` · `desktop-tools.ts` 等 | Enjoy 现状 **[已核实]** |
| https://developers.openai.com/codex/app/computer-use · learn.chatgpt.com/docs/computer-use | Codex 开通、审批、Win 前台、Locked use |
| https://code.claude.com/docs/en/computer-use · support.claude.com Cowork CU | Claude CLI/Desktop 开通、按应用、Esc、工具优先级 |
| https://platform.claude.com/docs/…/computer-use-tool · anthropic demos | API 工具面与 agent loop |
| https://docs.openhands.dev/…/agent-browser-use | 浏览器自动化 ≠ 本机桌面 |
| ACP / Zed | **无**标准桌面控制；CU 属宿主/Agent 自研 |

**未能 / 未深核**：Enjoy 设置页与 composer 的最终文案交互录屏；外置 ACP 会话是否已桥接 `desktop_*`；overlay 是否已挂到 `act` 生命周期——正文已标 **[待核]**。

---

*冲突时以 `design/specs/computer-use.md` 与现行产品锁为准。*
