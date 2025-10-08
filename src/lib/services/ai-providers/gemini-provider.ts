/**
 * Gemini AI Provider Implementation
 *
 * Wraps Google's Gemini API for use with the provider abstraction layer
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  AIProviderConfig,
  ImagePart,
  AIGenerationResult,
} from './ai-provider.interface';
import { GEMINI_CONFIG } from '../../config';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(config: AIProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.modelName || GEMINI_CONFIG.MODEL_NAME;
  }

  async generateContent(
    prompt: string,
    images?: ImagePart[]
  ): Promise<AIGenerationResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0 // Reduce hallucinations and improve source fidelity
      }
    });

    // Build content array: [prompt, ...images]
    const content: Array<string | ImagePart> = [prompt];
    if (images && images.length > 0) {
      content.push(...images);
    }

    const result = await model.generateContent(content);
    const response = result.response;
    const text = response.text();

    return { text };
  }

  getProviderName(): string {
    return 'gemini';
  }

  getModelName(): string {
    return this.modelName;
  }
}
