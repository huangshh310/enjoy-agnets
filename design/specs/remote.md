# spec/remote

> SSH 远程工作区：工作区在哪台机器，不是第三种引擎。最后更新：2026-09-13

## 当前真相

两层：`ssh_hosts` 是机器名册（alias / host / user / port / auth=`agent|keypath|password` / 本机 key_path / source=`manual|ssh_config|wsl`）；`workspaces` `kind=ssh` 是该机上的一个远端路径（`ssh_host_id` + 反范式 ssh_* 列给 factory / pool）。私钥内容不入库、不进 renderer、不进聊天。登录密码只走 IPC 写通道，main `safeStorage` 按 hostId 存；list / `workspace.remote` / SQLite 主机表都不含明文。新主机 `StrictHostKeyChecking=accept-new`（不必先去终端敲 yes）；密码登录走 `SSH_ASKPASS`，密钥/agent 仍 `BatchMode=yes`。用户在应用内填密码即可探测 / 浏览 / 连接。

连接态：`idle | connecting | connected | failed | disconnected`。事件 `workspace.remote`。`connecting` / `failed` / `disconnected` / `idle` 时 Composer 发送闸禁发。已连接时文件 / bash / git / 终端 cwd / ACP spawn 走 `AgentWorkspaceHost` 的 SSH 适配器，路径 jail 在 `remote_path`。断线写操作抛 `REMOTE_DISCONNECTED`，不得 `{ok:true}`。

入口：`#/settings/workspace` 远程连接名册（添加 / 编辑 / 删除 / 从 `~/.ssh/config` 发现具体 Host / 探测 / 一键打开配置文件）；创建项目弹窗可选远程，填已有远端路径后 `openSsh` + `connect`（不是 `mkdir`）；侧栏 SSH 项目带「远程」微标，切换会 `connect`（切走上一台 ssh 先 `disconnect`）；顶条可重试 / 断开。右栏不加「远程连接」项。

IPC：`workspace.sshHosts.list|upsert|remove|discover|openConfig`、`workspace.sshProbe`、`workspace.openSsh`（可带 `hostId`）/ `connect` / `disconnect` / `retry`。编辑主机时 `upsert` 传入已有 `id`，自动同步更新已有关联工作区的连接列。`openConfig`（即 `workspace.openSshConfig`）支持一键使用系统默认应用打开 `~/.ssh/config`（文件不存在时自动安全创建）或在系统文件管理器中一键定位私钥文件（`shell.showItemInFolder`）。删主机若仍有项目抛 `HOST_IN_USE`。导轨无「远程引擎」，`runtimeId` 不加 `ssh`。ACP 远程 spawn 经本机 `ssh` 跑远端 catalog basename，stdio 回 main；失败人话「远端未找到 {bin}」。本机不装远端 CLI 假路径，不读远端 `auth.json`。

视觉真源：[`../previews/p0-r-remote-workspace.html`](../previews/p0-r-remote-workspace.html)。

浏览：`workspace.sshBrowse` 列远端目录（无工作区 jail，路径必须绝对 POSIX），创建弹窗「浏览 / 使用此目录」只选文件夹。`sshProbe` 测通主机。`~/.ssh/config` 发现会丢掉 github.com 等 git SCM 主机。

本机客户端：macOS/Linux 用 `ssh`；Windows 优先 `System32\\OpenSSH\\ssh.exe`，cwd / `~` 展开走 `os.homedir()`（USERPROFILE）。WSL 发行版在 Windows 上经 `wsl.exe -d <distro>` 直连，**不必**在发行版里开 sshd；`ssh_hosts.source=wsl`。远端命令仍是 POSIX（`ls`/`cat`/`$HOME`）。Windows 机器当 SSH 服务端（cmd/PowerShell 远端）未做。

未落地：远程桌面、本机 sshfs 假副本、自动装远端 CLI、OpenHands 远程 Agent Server、云账号、Dev Container、Composer 运行位置 handoff。

## 不变量

- 远程是工作区位置，不上 Composer 导轨。
- renderer 只见 host/user/port/keyPath；密码框是写通道，列表不回填明文。本机密钥路径用 `workspace.pickSshKey` 系统文件对话框选择（默认打开 `~/.ssh`），不读私钥内容。
- 不得要求用户先去系统终端 `ssh` / `ssh-copy-id` 才能在应用里连上。
- 未接通不得列本机目录冒充远端。
- Cursor / Grok 等仅官方登录不因远程出现假 vault。

## 代码入口

- 迁移：`packages/db/src/migrations/workspace-ssh.ts`、`ssh-hosts.ts`（v9）
- 合约：`packages/ipc-contract/src/workspace-remote.ts`
- 连接层 / host：`apps/desktop/src/main/services/ssh/`
- 工厂：`workspace-host-factory.ts`
- UI：`settings/workspace/ssh-connections.tsx`（独立卡片名册）、`ssh-host-row.tsx`（服务器节点卡片）、`ssh-host-fields.tsx`（语义 Label + 双列网格）、`create-project-remote-step.tsx`、`remote-folder-picker.tsx`、`remote-status-strip.tsx`

## 已知坑

- **隐患**：把 SSH 名册直接塞入当前工作区基本信息卡片内部，导致工作区看板与指标割裂；或在工作区列表页重复嵌入名册。正确做法：名册作为独立卡片并列展示，工作区列表只留触发按钮。
- **隐患**：SSH 主机表单不声明 Label 仅靠 placeholder，导致用户输入后无法区分字段；错误直接纯文本裸露。正确做法：严格声明语义 Label、分列排版（主机+端口），错误使用高质感 Alert 警示条承载。
- **隐患**：把 SSH 散进每个 IPC handler。正确做法：handler 只问 host 工厂；测试替身只替换连接层。
- **隐患**：ACP 远程当热切换。正确做法：远端进程经 SSH stdio，失败说「远端未找到」，不假装 Kilo 式热切换。
- 本环境通常没有可达开发机；闸是注入连接层的单元测试 + 本机回归，不是真 SSH e2e。
- **隐患**：侧栏 `refreshAllWorkspaces` / `buildWorkspaceTree` 丢掉 `kind` 后，点远程项目会当成本机且不 `connect`。正确做法：hydrate 必须带 `locationKind` 与 ssh 字段；`loadWorkspace` 与 `selectPersistedSession` 对 ssh 自动 connect，切走上一台先 disconnect。
- **隐患**：`workspace.watch` / `openPreview` / checkpoint restore 若用 `workspaces.root_path`（`user@host:path`）当本机目录，会假成功或监视错盘。正确做法：SSH 跳过 `fs.watch`、preview 拒本机根、checkpoint 已连也诚实不可用（restore 抛错，不得 `{ok:true}`）。
- **隐患**：探测用 `BatchMode=yes` 且不处理 host key / 密码，新云主机报 `Host key verification failed`，账号密码用户永远连不上。正确做法：`accept-new`；密码走应用内表单 + `SSH_ASKPASS`；指纹变更仍拒绝并说人话。
- **隐患**：主机行探测按钮 `onProbe` 传入被 `void` 丢弃且前端用固定 600ms 定时器假重置，导致真实 SSH 探测（如超时 10s）在后台跑但前端看起来「毫无反应」，且成功态完全缺失反馈。正确做法：保持 Promise 链路真实 await；按钮提供完整的探测中（spinner）、连通正常（绿徽标）与连接失败（红徽标）三态转换，并在卡片内就近展开具体错误详情。

