import { AISourceContext } from '../types';

export interface AIStreamEvent {
  type: 'token' | 'done' | 'error';
  token?: string;
  error?: string;
}

export interface AIProviderRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  sources?: AISourceContext[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProviderResponse {
  content: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  modelName: string;
}

export interface AIProvider {
  id: string;
  name: string;
  capabilities: {
    chat: boolean;
    streaming: boolean;
    local: boolean;
  };
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
  generateStream(
    request: AIProviderRequest,
    onEvent: (event: AIStreamEvent) => void
  ): Promise<AIProviderResponse>;
}
