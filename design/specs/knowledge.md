# spec/knowledge

> 用户显式选择的本地 RAG。最后更新：2026-08-31

## 当前真相

包：`packages/knowledge`。来源、忽略规则、解析、确定性 chunk、本地余弦 / 词袋检索。SQLite 表：`knowledge_sources` `knowledge_documents` `knowledge_chunks` `knowledge_embeddings`。

只索引用户添加的文件或目录。`addKnowledgeSource` / `collectFiles` 都走 `resolveKnowledgePath`（`assertInsideRoot`），绝对路径和 `..` 逃逸即拒。自动排除 `.git`、构建目录、密钥文件和 `.gitignore`。单个文件失败不阻塞。`knowledge_documents` 记文件 hash：未变文件 Resume 跳过，Pause 把来源标 `paused`，Rebuild 清空 chunk 后全量重建。索引结束会对比 `knowledge_embeddings.model_id` 与当前 embedding 模型；不一致则只重嵌、不重解析。来源列表带 `embeddingsStale`。Agent 开跑时 `citeKnowledge` 按用户最后一句检索，结果作为 `source.added`；聊天与知识页点选打开 Files。检索可开 rerank：先试 SDK `rerank`（Cohere `reranking` 工厂），失败回落本地词袋+向量融合。`ai.generate` kind=`embedding`/`rerank` 走同一套向量，不再只发 warning。

路由：`#/knowledge`。设置：Knowledge Indexing。偏好 `knowledgeAutoIndex` 为真时，`knowledge.addSource` 会立刻 `indexKnowledgeSource`。

## 不变量

- 路径不得逃出工作区根。
- renderer 不直接读盘。
- 无 embedding 时用词袋兜底，不假装已向量化。

## 代码入口

- 忽略 / 分块 / 检索：`packages/knowledge`
- 路径 jail：`packages/db/src/path-safe.ts`（`resolveKnowledgePath`）
- 服务：`apps/desktop/src/main/services/knowledge-service.ts`（索引）；检索 `knowledge-search.ts`
- UI：`apps/desktop/src/renderer/src/components/knowledge/`

## 已知坑

- PDF 解析是启发式抽文本，复杂 PDF 可能 `pdf-unreadable`，不要当成完整 PDF 引擎。
- 索引先写 `hashedEmbedding`（32 维），有 Key 再 `embedMany` 覆盖。检索按 `model_id` 选同一套 query 向量，维度不一致时回落词袋。
- Provider / embedding 模型变了不会自动清文档；Resume 或再次 Index 会 `reembedStaleSource`。Rebuild 才清空 chunk。
- Provider embed 失败或超过 8s 回落 hashed，不要让索引一直转。`ENJOY_E2E_STUB` 跳过 Provider embed。添加来源后立刻刷新列表，索引完成再刷一次。
- 分块 / 余弦排序有吞吐单测（约 8000 行 / 500 向量）。Agent / generate 会写 `ttfoMs`；用真实 Key 才能解释成模型 TTFO，stub 只证明字段被写入。
- Cohere 以外没有官方 rerank 工厂时 `createRerankModel` 返回 undefined，必须走本地融合，不要空排。
- 来源路径必须 `assertInsideRoot`；不要 `join(root, rel)` 后直接 `stat`，POSIX 上绝对 `rel` 会丢掉 root。
