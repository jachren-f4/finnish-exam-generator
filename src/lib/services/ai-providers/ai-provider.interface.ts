/**
 * AI Provider Abstraction Layer
 *
 * Defines interfaces for swapping between different LLM providers (Gemini, OpenAI, etc.)
 * allowing easy switching via environment variable configuration.
 */

/**
 * Image part for multimodal AI generation
 */
export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

/**
 * Result from AI content generation
 */
export interface AIGenerationResult {
  text: string;
}

/**
 * Configuration for AI provider initialization
 */
export interface AIProviderConfig {
  apiKey: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Base interface that all AI providers must implement
 */
export interface AIProvider {
  /**
   * Generate content from text prompt and optional images
   *
   * @param prompt - The text prompt to send to the AI
   * @param images - Optional array of images for multimodal generation
   * @returns Promise resolving to generated text content
   */
  generateContent(prompt: string, images?: ImagePart[]): Promise<AIGenerationResult>;

  /**
   * Get the provider name (e.g., "gemini", "openai")
   */
  getProviderName(): string;

  /**
   * Get the model name being used
   */
  getModelName(): string;
}
