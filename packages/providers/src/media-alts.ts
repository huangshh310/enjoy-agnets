/**
 * 同族备用模型 id：主路径失败后换第二条 OpenAI 兼容能力。
 */
export function alternateImageModelId(modelId: string): string {
  if (modelId === "dall-e-3" || modelId === "dall-e-2") return "gpt-image-1"
  if (modelId === "gpt-image-1") return "dall-e-3"
  if (modelId === "grok-imagine-image-2.0") return "grok-imagine-image"
  if (modelId === "grok-imagine-image") return "grok-imagine-image-2.0"
  return modelId
}

export function alternateSpeechModelId(modelId: string): string {
  if (modelId === "tts-1") return "tts-1-hd"
  if (modelId === "tts-1-hd") return "tts-1"
  if (modelId === "eleven_monolingual_v1") return "eleven_multilingual_v2"
  if (modelId === "eleven_multilingual_v2") return "eleven_monolingual_v1"
  return modelId
}

export function alternateTranscriptionModelId(modelId: string): string {
  if (modelId === "whisper-1") return "gpt-4o-mini-transcribe"
  if (/transcribe/i.test(modelId)) return "whisper-1"
  if (/nova|deepgram/i.test(modelId)) return "whisper-1"
  return modelId
}
