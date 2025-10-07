/**
 * AI Provider Factory
 *
 * Creates the appropriate AI provider based on environment configuration
 */

import { AIProvider, AIProviderConfig } from './ai-provider.interface';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';

export type AIProviderType = 'gemini' | 'openai';

/**
 * Get the configured AI provider from environment variable
 * Defaults to 'gemini' if not specified
 */
export function getConfiguredProviderType(): AIProviderType {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'openai') {
    return 'openai';
  }
  return 'gemini'; // default
}

/**
 * Create an AI provider instance based on the specified type
 *
 * @param providerType - The type of provider to create ('gemini' or 'openai')
 * @param config - Optional configuration (API key, model name, etc.)
 * @returns AIProvider instance
 * @throws Error if required environment variables are missing
 */
export function createAIProvider(
  providerType?: AIProviderType,
  config?: Partial<AIProviderConfig>
): AIProvider {
  const type = providerType || getConfiguredProviderType();

  switch (type) {
    case 'gemini': {
      const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      return new GeminiProvider({
        apiKey,
        modelName: config?.modelName || 'gemini-2.0-flash-exp',
      });
    }

    case 'openai': {
      const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      return new OpenAIProvider({
        apiKey,
        modelName: config?.modelName || 'gpt-4o-mini',
      });
    }

    default: {
      throw new Error(`Unknown AI provider type: ${type}`);
    }
  }
}
