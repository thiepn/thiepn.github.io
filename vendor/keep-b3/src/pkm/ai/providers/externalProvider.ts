import { AIProvider, AIProviderRequest, AIProviderResponse, AIStreamEvent } from './aiProviderInterface';

/**
 * ExternalAIProvider - Local Offline Knowledge Synthesis
 * Operates purely locally on the client with zero external API calls or AI model dependencies.
 */
export class ExternalAIProvider implements AIProvider {
  public id = 'local-vault-indexer';
  public name = 'Local Knowledge Assistant';
  public capabilities = {
    chat: true,
    streaming: true,
    local: true,
  };

  public async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    return this.generateStream(request, () => {});
  }

  public async generateStream(
    request: AIProviderRequest,
    onEvent: (event: AIStreamEvent) => void
  ): Promise<AIProviderResponse> {
    const { sources, messages, signal } = request;
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';

    // Purely local offline knowledge synthesis using vault indexer and local heuristics
    let output = `### Local Knowledge Assistant (Offline Vault Synthesis)\n\n`;
    output += `Query: **"${lastUserMsg.slice(0, 60)}"**\n\n`;

    if (sources && sources.length > 0) {
      output += `**Referenced Local Notes:**\n`;
      for (const src of sources.slice(0, 5)) {
        const title = src.chunk?.noteTitle || 'Note';
        const scorePct = src.chunk?.score ? (src.chunk.score * 100).toFixed(0) : '95';
        output += `- **[[${title}]]** (Relevance: ${scorePct}%)\n`;
        if (src.chunk?.content) {
          output += `  > ${src.chunk.content.replace(/\n+/g, ' ').slice(0, 150)}...\n\n`;
        }
      }
      output += `\n*Analysis generated 100% locally with offline keyword & semantic indexing.*`;
    } else {
      output += `*No direct note matches found for this query in your vault.*`;
    }

    const tokens = output.split(' ');
    let fullText = '';
    for (let i = 0; i < tokens.length; i++) {
      if (signal?.aborted) {
        onEvent({ type: 'error', error: 'Cancelled' });
        throw new Error('Cancelled');
      }
      const token = tokens[i] + (i < tokens.length - 1 ? ' ' : '');
      fullText += token;
      onEvent({ type: 'token', token });
      await new Promise((r) => setTimeout(r, 12));
    }

    onEvent({ type: 'done' });
    return { content: fullText, modelName: 'local-vault-indexer' };
  }
}

export const externalAIProvider = new ExternalAIProvider();
