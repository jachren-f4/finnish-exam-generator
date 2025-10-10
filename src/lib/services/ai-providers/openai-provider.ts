/**
 * OpenAI Provider Implementation
 *
 * Wraps OpenAI's API (ChatGPT-4o-mini) for use with the provider abstraction layer
 */

import OpenAI from 'openai';
import {
  AIProvider,
  AIProviderConfig,
  ImagePart,
  AIGenerationResult,
} from './ai-provider.interface';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.modelName = config.modelName || 'gpt-4o-mini';
  }

  async generateContent(
    prompt: string,
    images?: ImagePart[]
  ): Promise<AIGenerationResult> {
    // Build messages array with text and images
    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [{ type: 'text', text: prompt }];

    // Add images if provided
    if (images && images.length > 0) {
      for (const image of images) {
        // Convert inline data to data URL format
        const dataUrl = `data:${image.inlineData.mimeType};base64,${image.inlineData.data}`;
        content.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      }
    }

    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
      max_tokens: 4000,
    });

    const text = response.choices[0]?.message?.content || '';
    return { text };
  }

  getProviderName(): string {
    return 'openai';
  }

  getModelName(): string {
    return this.modelName;
  }
}
