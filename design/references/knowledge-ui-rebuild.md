# 知识页完整改造清单与界面重构设计

> 版本：1.0 · 2026-09-05  
> 路由：`#/knowledge`  
> 组装：`knowledge-page.tsx` + `use-knowledge-page.ts`  
> 视觉：BoardUI token，禁止 Generic-SaaS-Card / Centered-Marketing-Hero  
> 不变量：路径 jail、renderer 不读盘、无向量时词袋兜底、Pin 进芯片不进输入框

配套原则见 [`knowledge-ui-redesign.md`](./knowledge-ui-redesign.md)。本文是**可施工的重构说明书**：改哪些文件、页面怎么拆、状态机、验收。

---

## 0. 目标一句话

把「四张文件夹卡 + 文件运维表 + 可开关的测试检索」改成：

**默认打开的检索舞台 + 非对称记忆 Bento + 默认收起的索引抽屉。**

左栏集合树只做范围切换；主区不再重复四张封面卡。

---

## 1. 重构后信息架构

```
SecondaryPageShell
│  左栏 groups     全部 | 各源（仅「在盘且已加源或预设存在」）
│                  失败/缺失源不进主列表，角标数字 = 可问块
│
└─ 主列（上→下，单滚动）
   1. CompactHeader     标题 · 可问块/仅扫描/失败 · 添加来源 · 管理索引
   2. RetrievalStage    始终展开（不再是 drawer toggle）
   3. MemoryBento       脉冲 span-2 | 透镜 span-1 | 健康 span-1
   4. IndexDrawer       默认折叠；内含来源行 + 文件矩阵
   5. Modals            Add / Edit / Preview（保留）
```

删除首页上的：

- 四等分 `KnowledgeFolderCards`
- 「本地 / 零云 RAG」营销徽章
- 顶栏「测试检索」开关（舞台常驻）
- 把 `ENOENT` 原文画在卡面
- 无语义、仅 localStorage 级的星标（改为「默认透镜」）

---

## 2. 界面重构（结构稿）

### 2.1 CompactHeader

```
[知识]                              [添加来源]  [管理索引]
可问 128 块 · 扫描 17 文件 · 2 源不可用
```

| 字段 | 数据 | 展示规则 |
|---|---|---|
| 可问块 | `sum(source.chunkCount)` 且源 status 可用于检索 | 主数字 |
| 扫描文件 | `documents.length` | 次级 |
| 可问文件 | `documents` 中 chunkCount>0 或已入库且非 unindexed | 不要和扫描文件混称「已索引」 |
| 不可用源 | status=error 或 missingOnDisk | 点标题滚动到健康条 |

Props 从 `fileCount + chunkCount` 改为派生对象 `KnowledgeStats`（见 §4）。

主按钮是「添加来源」（outline 或 secondary）。「管理索引」只切抽屉，不是检索。

### 2.2 RetrievalStage（主舞台，min-height 约 280–360）

```
┌─────────────────────────────────────────────────────────┐
│  问这批记忆…                                    [Rerank] │
│  范围：当前透镜 ▾                                       │
├─────────────────────────────────────────────────────────┤
│  snippet │ 左色条 │ 2–3 行 │ path · 透镜名 │ 钉到对话   │
│  snippet │ ...                                          │
│  空：最近 5 条 Agent 引用 / 「还没有可问的块」          │
└─────────────────────────────────────────────────────────┘
```

- 默认焦点在输入。Enter 搜。  
- 范围：`all-ready` | `selected-folder` | 单源 id。  
- 命中卡主 CTA：`Pin to chat`（调现有会话上下文芯片 API；若 hook 里还没有，P1 补，见清单 K-P1-12）。  
- 次 CTA：预览（开 `KnowledgeFilePreviewModal`，先 `selectedPath`）、仅此源再搜。  
- 检索中：舞台边使用已有 `BorderBeam`，透镜列表同步降对比。  
- 关闭「测试检索 / 隐藏测试器」文案，改为「检索」。

现有 `KnowledgeRetrieverDrawer` 的查询/命中/rerank 逻辑迁入本组件；Drawer 外壳废弃或只给窄屏。

### 2.3 MemoryBento

```
┌─────────────────────────────┐ ┌──────────┐ ┌──────────┐
│ 脉冲                        │ │ 透镜     │ │ 健康     │
│ 128                         │ │ ✓ 工作区 │ │ 2 不可用 │
│ 可问块                      │ │ ✓ src    │ │ 重选路径 │
│ 覆盖 4/6 源 · 上次命中 2h   │ │ ☆ 默认   │ │ 移出     │
│ [为当前透镜建索引]          │ │          │ │          │
└─────────────────────────────┘ └──────────┘ └──────────┘
```

栅格：`grid-cols-1 lg:grid-cols-4`，脉冲 `lg:col-span-2`。

**脉冲**

- 0 可问块：主文案「还不能问」，按钮「为当前透镜建索引」（调用 `handleIndexFolder`）。  
- 有块：不放营销句，只放数字 + 覆盖（就绪源 / 源总数）。

**透镜**

- 一行一源：开关（是否纳入本次检索）+ 名称 + 块数。  
- 「默认」星：写入偏好（工作区级，不要只停在 `useState` 且无持久化）。语义：新检索默认范围。  
- 缺失源不出现在此列。

**健康**

- 折叠摘要：「2 个源不在当前工作区」。  
- 展开行：短相对路径 + 人类可读原因（`pathNotFound` / `statusError`），**禁止**整段 Node errno。  
- 动作：重新选择（开 EditModal）· 从本工作区移除（现有 `handleRemoveSource`）· 禁用 Index Now。

### 2.4 IndexDrawer

默认 `closed`。Header「管理索引」或健康条「查看源」打开。

内含两块，用已有 tab 或上下分区：

1. **来源** — 复用 `knowledge-sources-table` 列：路径、status、块、Resume/Rebuild/Edit/Remove。Rebuild 不因「路径没变」禁用。  
2. **文件** — `knowledge-documents-table` 改列（§5）。默认 filter = 当前透镜；chip：可问 / 仅扫描 / 全部格式。

打开抽屉时不要把舞台挤出视口：抽屉在舞台与 Bento 下方，页内滚动。

### 2.5 左栏

`page.groups` 只保留：

- `all`：全部可问范围  
- 每个**在盘**的源或存在的预设目录  

角标用 **chunkCount**，不用「扫到的文件数 17」。缺失预设可在组底「不可用 (2)」弱入口，或完全只放健康条。

点左栏 = `setSelectedFolder`，并作为检索默认范围。`View Files` 必须先写 `selectedPath`。

### 2.6 动效（克制）

| 事件 | 表现 | 上限 |
|---|---|---|
| 检索中 | 舞台 `BorderBeam` | 一次检索一条 |
| 有命中的透镜 | 边框 accent / 其余 40% 透明 | 300ms |
| 索引写入 | 脉冲数字变化，点阵变密 | 无循环闪烁 |
| 错误 | 健康条 amber/rose token | 不弹原生 dialog |

禁止粒子图谱、大文件夹悬浮、Hero 渐变。

---

## 3. 文件级改造清单

图例：D 删除主路径引用 · R 重构 · N 新建 · K 文案 · T 测试 · I IPC/会话（若缺）

### P0 — 诚实与降噪（先合，不改大布局也可先做）

| ID | 文件 | 动作 |
|---|---|---|
| K-P0-01 | `use-knowledge-page.ts` | 派生 `stats`: `askableChunks`, `scannedFiles`, `askableFiles`, `readySources`, `unavailableSources`。`askableChunks===0` 时不要把扫描数当完成态。 |
| K-P0-02 | `knowledge-page-header.tsx` | 文案改用 stats；去掉 `localOnly` 徽章；副标题用 `statsAskable` 而不是 `stats(fileCount, chunkCount)` 在 0 块时说「已索引」。 |
| K-P0-03 | `knowledge-folder-cards.tsx` | 错误行改 `t("pages.knowledge.pathNotFound")` 等短句，**禁止** `state.error` 原文上卡。Index Now 在 `missingOnDisk` 禁用（spec 已写，核对实现）。 |
| K-P0-04 | `pages-knowledge` zh/en | 统一 status：可问 / 仅扫描 / 缺失 / 错误 / 构建中。表内禁止裸 `Unindexed`。 |
| K-P0-05 | `knowledge-documents-table.tsx` | 「全部已索引文件」计数 = askableFiles，不是 documents.length。增加 chip「仅扫描」。 |
| K-P0-06 | `knowledge-table-format.ts` | status 走 i18n，不写死英文。 |
| K-P0-07 | `design/specs/knowledge.md` | 「当前真相」补一句：首页数字以可问块为准；errno 不上主表面。 |

### P1 — 布局重构（本设计的主体）

| ID | 文件 | 动作 |
|---|---|---|
| K-P1-01 | `knowledge-retrieval-stage.tsx` | **新建**。承接 drawer 的 query/hits/rerank/search UI；常驻；空态最近引用。 |
| K-P1-02 | `knowledge-memory-bento.tsx` | **新建**。脉冲 + 透镜开关 + 健康条。 |
| K-P1-03 | `knowledge-index-drawer.tsx` | **新建**或把 documents+sources 表包进可折叠区。默认 closed。 |
| K-P1-04 | `knowledge-page.tsx` | 组装改为 Header → Stage → Bento → IndexDrawer → Modals。去掉 `<KnowledgeFolderCards>`。RetrieverDrawer 不再作为可开关块。 |
| K-P1-05 | `knowledge-page-header.tsx` | 去掉 testRetrieval toggle；右钮改为 add + openIndex。 |
| K-P1-06 | `knowledge-retriever-drawer.tsx` | 逻辑迁出后标记 deprecated，或改成 Stage 内部的窄屏折叠。不要两处搜索框。 |
| K-P1-07 | `knowledge-folder-cards.tsx` | 退出首页。预设色、星标 UI 删除。若别处无引用可删文件。预设列表改由 `knowledge-constants` + Bento/左栏消费。 |
| K-P1-08 | `use-knowledge-page.ts` | `isRetrieverOpen` 默认无意义则删除。新增 `isIndexOpen`、`lensEnabledIds`、`defaultLensId`、`recentCitations`。`groups` 过滤缺失源。 |
| K-P1-09 | `knowledge-documents-table.tsx` | 列改为：路径、透镜、可检索性、块数、最近引用、操作。操作保留预览 / 快搜。重建放来源区不放每文件。 |
| K-P1-10 | `knowledge-sources-table.tsx` | 进入抽屉；Rebuild 在路径未变时可用；error 显示短句 + tooltip 可放详细 error。 |
| K-P1-11 | 左栏 `groups` 构造处（hook） | 角标 = chunks；`unavailable` 不进主 group 或单独弱组。 |
| K-P1-12 | 会话衔接 | Stage「钉到对话」写入上下文芯片（对照 chat 现有 pin/source chip；没有就在 agent/chat 侧补最小 API）。发送拼 snippet。 |
| K-P1-13 | Preview / View Files | 任何「看文件」先 `setSelectedFolder`/`selectedPath` 再开预览或抽屉文件区。 |
| K-P1-14 | i18n zh+en | 新增 key：`askableChunks`、`stillUnaskable`、`indexThisLens`、`pinToChat`、`manageIndex`、`unavailableSources`、`lensDefault`、`recentCitationsEmpty`。删或停用 `localOnly`、`testRetrieval`、`hideTester` 首页用法。 |

### P2 — 记忆感与闭环

| ID | 文件 | 动作 |
|---|---|---|
| K-P2-01 | Stage + Bento | 检索后点亮命中透镜，未命中 40% 透明，300ms。 |
| K-P2-02 | Bento 透镜表面 | 块密度点阵（token 色，低对比）。0 块空白。 |
| K-P2-03 | documents 行 | 「被引用」标记；数据来自 cite 日志或 hit 历史（无数据则隐藏列，禁止假数据）。 |
| K-P2-04 | Chat citation | 点击回知识页并定位 snippet（query + doc path）。 |
| K-P2-05 | 默认透镜 | 持久化到工作区偏好，刷新仍在。 |
| K-P2-06 | 空工作区 | 无源无文件：舞台说明 + 添加来源，不渲染四张空预设大卡。 |

### 测试

| ID | 文件 | 覆盖 |
|---|---|---|
| K-T-01 | hook / filter 单测 | stats：17 文件 0 块 → askableChunks=0，scanned=17 |
| K-T-02 | folder/health | missingOnDisk 禁用 index；UI 不含 `ENOENT` |
| K-T-03 | documents filter | 「可问」chip 不含 unindexed |
| K-T-04 | selectedPath | View Files / 预览前 path 已写 |
| K-T-05 | e2e 若有 knowledge | 首屏有检索输入；无「测试检索」才能搜 |

---

## 4. Hook 派生数据（实现合同）

```ts
type KnowledgeStats = {
  askableChunks: number
  scannedFiles: number
  askableFiles: number
  readySourceCount: number
  sourceCount: number
  unavailable: Array<{
    id?: string
    path: string
    reason: "missing" | "error"
    // detail 仅 tooltip / 日志，不上卡面
    detail?: string
  }>
}

type KnowledgeLens = {
  id: string          // source id 或 preset path
  path: string
  label: string
  chunkCount: number
  ready: boolean
  enabled: boolean    // 是否纳入本次检索
  isDefault: boolean
}
```

`totalChunks` 保留但只等于 `askableChunks` 的别名，Header 禁止再用 `documents.length` 冒充已索引。

`handleSearch` 增加 `sourceIds?: string[]`（仅 enabled lens）。现有 `knowledge.search` IPC 若只支持 query，P1 可先前端滤 hits 的 source，P2 再把范围下到 main。

---

## 5. 文件表列映射

| 旧列 | 新列 | 取值 |
|---|---|---|
| 文档与路径 | 同 | 相对路径 |
| 所属集合 | 所属透镜 | source 名 |
| 向量分块 | 块数 | chunkCount |
| 状态 Unindexed | 可检索性 | 有块 / 仅扫描 / 忽略 / 失败 / 构建中 |
| 操作 预览+搜 | 预览 · 在舞台搜此文件 | 先写 selectedPath |

禁止表头「全部已索引文件 17」在 0 块时亮蓝。

---

## 6. 页面状态机

```
无工作区     → 空壳 + 打开工作区
有工作区无源 → Stage 空态 + 添加来源；Bento 脉冲 0；无大卡
有源 0 块    → Stage 可输入但提示不能问；脉冲 CTA 建索引
索引中       → 脉冲文件数涨；左栏角标可不变直到有块
就绪         → Stage 可搜；命中可 Pin
源缺失/错误  → 透镜隐藏该源；健康条计数；不可 Index Now
抽屉打开     → 不改变 Stage 数据，只滚到表
```

---

## 7. 组装伪代码（目标 `knowledge-page.tsx`）

```tsx
<SecondaryPageShell groups={page.lensGroups} selectedId={page.selectedFolder ?? "all"} ...>
  <CompactHeader stats={page.stats} onAdd={...} onOpenIndex={() => page.setIndexOpen(true)} />
  {page.actionError ? <InlineError /> : null}

  <KnowledgeRetrievalStage
    query={page.query}
    hits={page.hits}
    recent={page.recentCitations}
    isSearching={page.isSearching}
    onSearch={page.handleSearch}
    onPin={page.handlePinToChat}
    onPreview={...}
    lensActive={page.enabledLenses}
  />

  <KnowledgeMemoryBento
    stats={page.stats}
    lenses={page.lenses}
    onToggleLens={page.toggleLens}
    onSetDefault={page.setDefaultLens}
    onIndex={page.handleIndexFolder}
    onRepair={page.openEdit}
    onRemove={page.handleRemoveSource}
  />

  <KnowledgeIndexPanel
    open={page.isIndexOpen}
    onOpenChange={page.setIndexOpen}
    sources={...}
    documents={...}
  />

  {/* Add / Edit / Preview 不变 */}
</SecondaryPageShell>
```

---

## 8. 明确不改

- `packages/knowledge` 分块 / 检索算法  
- 路径 `resolveKnowledgePath` / jail  
- IPC 频道名（除非 Pin / 按源搜索现有合同不够，单独立项）  
- Add / Edit / Preview Modal 的选路与 rebuild 语义（只改入口位置）  
- BoardUI token、复合字号、ConfirmDialog  

---

## 9. 验收清单（合入前勾）

**产品**

- [ ] 进入 `#/knowledge` 不点按钮即可看到检索输入  
- [ ] 17 文件 0 块时主数字不是「已索引 17」  
- [ ] 主区无四张等宽文件夹卡  
- [ ] 缺失源不占主卡面，无 ENOENT 正文  
- [ ] 左栏与主区不重复四套封面  
- [ ] 添加来源成功后列表刷新；Indexing 1.5s 轮询仍在  

**交互**

- [ ] Pin 后会话出现芯片，发送带 snippet  
- [ ] 预览 / View Files 带 selectedPath  
- [ ] 缺失源不能点立即索引  
- [ ] 路径未改也能 Rebuild  
- [ ] 无 `window.confirm` / `alert`  

**视觉**

- [ ] 非对称 Bento，无 Generic-SaaS 四宫格  
- [ ] 无营销徽章、无 Hero  
- [ ] 仅 token 色与复合字号  
- [ ] 表格全宽  

**文档**

- [ ] `design/specs/knowledge.md` 当前真相与本页结构一致  
- [ ] i18n 中英键齐全  

---

## 10. 建议提交切分

1. `fix(knowledge-ui): honest stats and status copy`（P0）  
2. `feat(knowledge-ui): retrieval stage as default surface`（P1-01/04/05/06）  
3. `feat(knowledge-ui): memory bento replace folder cards`（P1-02/07/08）  
4. `feat(knowledge-ui): index panel drawer`（P1-03/09/10）  
5. `feat(knowledge-ui): pin to chat from retrieval hits`（P1-12）  
6. `feat(knowledge-ui): lens glow and citation return`（P2）  

不要一个 PR 同时改检索算法和整页布局。

---

## 11. 和上一份设计文档的关系

| 文档 | 用途 |
|---|---|
| `knowledge-ui-redesign.md` | 原则、对标、为什么这样 |
| **本文** `knowledge-ui-rebuild.md` | 结构稿、文件清单、状态机、验收、PR 切分 |

实现以本文 §3–§9 为准；冲突时以 `knowledge.md` 不变量优先。
