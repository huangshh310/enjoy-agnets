# spec/media

> 应用资产库与实验媒体。最后更新：2026-09-01

## 当前真相

包：`packages/assets`。二进制在 `userData/assets`，SQLite 存 hash / 类型 / 大小 / 来源。导入 `assets.import` 上限 8 MB（base64 合约封顶 12_000_000）。导入时 `resolveMediaType`：空 type / `octet-stream` 按扩展名补（`.md` → `text/markdown`），不要默认二进制。导出 `assets.export` 必须给工作区相对路径并做逃逸校验；覆盖需显式 `overwrite`。真正写盘前弹出系统保存框，选中路径再 `resolvePickedExportPath`；`ENJOY_E2E_STUB` 跳过对话框。`experimentalMedia` 为假时 main 拒绝 `video` / `realtime-session`。

生成图片 / 语音 / 视频后发 `asset.created`。`assets.upload` 走 SDK `uploadFile` / `uploadSkill`，按 hash 写入 `provider_file_refs`。视频与 Realtime 标实验。媒体生成走两条路径：主模型失败后换同族备用（如 `dall-e-3` ↔ `gpt-image-1`，视频失败回落静图）。Realtime 由 main 先尝试 Provider WebSocket，失败回落本地回环。Composer 语音键打开会话后用 `getUserMedia` 采 PCM16 帧，经 `realtime.sendAudio` 交给 main；回传的 `realtime.text` 写入 composer，并折进当前助手消息。

路由：`#/media`。设置：Media & Assets。页面可 `ai.generate` 生图 / 语音 / 实验视频 / 转写 / 翻译（后两者需先点选音频资产）。聊天 Composer 选 imagine / dall-e 等生图模型时同样走 `generateImage`，不要走 Agent 文本循环。翻译复用 transcription capability，走 `kind=translation`。当前模型未声明对应 capability 时按钮禁用并给出原因。导出若 `overwriteRisk` 会提示，不会默默覆盖。相对路径的中间目录会 `mkdir`，失败会在页面显示原因。聊天内用户附件仍是缩略图；助手 `generateImage` 结果用 BeUI Image Generation 表面（BoardUI 换皮）展示，见 `ui` spec。

## 不变量

- 写入工作区必须显式导出 + 路径审批。
- renderer 不持有 Provider Key，不直接 `fs`。

## 代码入口

- `packages/assets`
- `apps/desktop/src/main/services/asset-service.ts`
- `apps/desktop/src/main/services/media-generation.ts`
- `apps/desktop/src/main/services/realtime-service.ts`
- `apps/desktop/src/main/services/attach-realtime-ws.ts`
- `apps/desktop/src/main/services/provider-files.ts`

## 已知坑

- 大文件 `bytesBase64` 走 IPC，超过 8 MB 直接拒；后续应改流式分片。
- `.md` / `.txt` 在 Windows 上 `File.type` 常为空。导入必须 `resolveMediaType`，否则会落成 `application/octet-stream`，聊天再当二进制 file part 发给 grok 会空输出。
- 资产进了 `assets` 表不等于气泡能回放。用户消息必须有 `message_parts` 的 `file` part（`assetId`）；旧会话只有 text 时，列出消息按「上一轮之后到本轮发送」的 `source=import` 资产补回，不要按文件名猜。
- 覆盖确认是两步：先预览 `overwriteRisk`，页面再带 `overwrite: true`；写盘仍要过系统保存框，不要只信 renderer 的布尔值。
- 导出到 `assets/export.bin` 这类尚未存在的子目录时，必须先 `mkdir` 父目录，否则 `writeFile` 抛 ENOENT，页面原先不 catch 会像没点到。
- 生图 / TTS / STT：`kind=fal|replicate|elevenlabs|deepgram|cohere` 走官方 `@ai-sdk/*` 工厂；其它 kind 走 OpenAI 兼容 `image()`（xAI `/v1/images/generations` 可用这条）。失败先换同族模型，再换已配置的官方媒体档案（Fal/Replicate/ElevenLabs/Deepgram）。转写先动态探测 `experimental_streamTranscribe`，没有则一次性 `transcribe`。翻译走 `experimental_streamTranslate` + OpenAI `translation()`；空结果会换备用模型，再失败记 run.failed。
- 在聊天里选 `grok-imagine-image-2.0` 却走 `agent.run`：SDK 7 生图是 `generateImage`，Chat Completions 不服务 imagine 模型，结果是 `No output generated`。Composer 必须按模型 id 分流到 `ai.generate` kind=`image`。
- Realtime WebSocket 需要对应 Provider Key 与 `wss` 可达；无 Key 或握手失败时保持本地回环，不要假装已连上远端。
