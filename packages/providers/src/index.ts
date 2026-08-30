import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type ProviderId = "deepseek" | "openai" | "anthropic" | "openrouter" | "ollama";

export type ProviderConfig = {
  provider: ProviderId;
  apiKey: string;
  modelId: string;
  baseURL?: string;
};

export const MODEL_CATALOG = [
  { id: "deepseek-chat", label: "DeepSeek V4", provider: "deepseek" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", provider: "deepseek" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic" },
  { id: "llama3.1", label: "Ollama Llama 3.1", provider: "ollama" }
] as const;

export function createLanguageModel(config: ProviderConfig): LanguageModel {
  switch (config.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.modelId);
    }
    case "ollama": {
      const ollama = createOpenAI({
        apiKey: config.apiKey || "ollama",
        baseURL: config.baseURL ?? "http://127.0.0.1:11434/v1"
      });
      return ollama(config.modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? "https://openrouter.ai/api/v1"
      });
      return openrouter(config.modelId);
    }
    case "deepseek": {
      const deepseek = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? "https://api.deepseek.com/v1"
      });
      return deepseek(config.modelId);
    }
    case "openai":
    default: {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL
      });
      return openai(config.modelId);
    }
  }
}

export function providerForModel(modelId: string): ProviderId {
  const match = MODEL_CATALOG.find((entry) => entry.id === modelId);
  return match?.provider ?? "deepseek";
}
