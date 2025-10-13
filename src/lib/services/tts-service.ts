/**
 * Text-to-Speech Service using Google Cloud TTS API
 * Converts educational summaries to audio MP3 files
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'

export interface TTSConfig {
  languageCode: string // e.g., 'fi-FI', 'en-US'
  voiceName?: string // Optional specific voice
  audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS'
  speakingRate?: number // 0.25 to 4.0, default 1.0
  pitch?: number // -20.0 to 20.0, default 0.0
}

export interface AudioResult {
  audioBuffer: Buffer
  metadata: {
    durationSeconds: number
    fileSizeBytes: number
    voiceUsed: string
    languageCode: string
    generatedAt: string
  }
}

export class TTSService {
  private client: TextToSpeechClient | null = null

  /**
   * Initialize the TTS client with service account credentials
   */
  private initializeClient(): TextToSpeechClient {
    if (this.client) {
      return this.client
    }

    const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON

    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS_JSON environment variable is not set')
    }

    try {
      const credentials = JSON.parse(credentialsJson)

      this.client = new TextToSpeechClient({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        projectId: credentials.project_id,
      })

      console.log('[TTS] Initialized Google Cloud TTS client with service account')
      return this.client

    } catch (error) {
      console.error('[TTS] Failed to parse GOOGLE_CLOUD_CREDENTIALS_JSON:', error)
      throw new Error('Invalid GOOGLE_CLOUD_CREDENTIALS_JSON format')
    }
  }

  /**
   * Generate audio from text using Google Cloud TTS
   */
  async generateAudio(text: string, config: TTSConfig): Promise<AudioResult> {
    const startTime = Date.now()
    console.log('[TTS] Starting audio generation')
    console.log('[TTS] Text length:', text.length, 'characters')
    console.log('[TTS] Language:', config.languageCode)

    const client = this.initializeClient()

    // Determine voice name based on language
    const voiceName = config.voiceName || this.getDefaultVoiceName(config.languageCode)

    // Prepare TTS request
    const request = {
      input: { text },
      voice: {
        languageCode: config.languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: (config.audioEncoding || 'MP3') as any,
        speakingRate: config.speakingRate || 1.0,
        pitch: config.pitch || 0.0,
      },
    }

    try {
      console.log('[TTS] Calling Google Cloud TTS API...')
      console.log('[TTS] Request config:', {
        languageCode: config.languageCode,
        voiceName: voiceName,
        textLength: text.length,
        audioEncoding: config.audioEncoding
      })

      const [response] = await client.synthesizeSpeech(request)
      console.log('[TTS] TTS API responded')

      if (!response.audioContent) {
        console.error('[TTS] ERROR: No audio content in TTS response')
        throw new Error('No audio content in TTS response')
      }

      // Convert audio content to Buffer
      const audioBuffer = Buffer.from(response.audioContent as Uint8Array)

      // Calculate approximate duration (rough estimate: 150 words per minute)
      const wordCount = text.split(/\s+/).length
      const durationSeconds = Math.ceil((wordCount / 150) * 60)

      const duration = Date.now() - startTime
      console.log('[TTS] Audio generated successfully')
      console.log('[TTS] File size:', audioBuffer.length, 'bytes')
      console.log('[TTS] Estimated duration:', durationSeconds, 'seconds')
      console.log('[TTS] Generation time:', duration, 'ms')

      return {
        audioBuffer,
        metadata: {
          durationSeconds,
          fileSizeBytes: audioBuffer.length,
          voiceUsed: voiceName,
          languageCode: config.languageCode,
          generatedAt: new Date().toISOString(),
        },
      }

    } catch (error) {
      console.error('[TTS] Audio generation failed')
      console.error('[TTS] Error type:', error?.constructor?.name)
      console.error('[TTS] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[TTS] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      if (error && typeof error === 'object') {
        console.error('[TTS] Error details:', JSON.stringify(error, null, 2))
      }

      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get default voice name for a language code
   */
  private getDefaultVoiceName(languageCode: string): string {
    // Map common language codes to high-quality voices
    const voiceMap: Record<string, string> = {
      'fi-FI': 'fi-FI-Standard-B', // Finnish (only Standard-B exists, female voice)
      'en-US': 'en-US-Neural2-C', // English (US)
      'en-GB': 'en-GB-Neural2-B', // English (UK)
      'sv-SE': 'sv-SE-Standard-A', // Swedish
      'de-DE': 'de-DE-Neural2-B', // German
      'fr-FR': 'fr-FR-Neural2-B', // French
      'es-ES': 'es-ES-Neural2-B', // Spanish
    }

    return voiceMap[languageCode] || `${languageCode}-Standard-A`
  }

  /**
   * Map ISO 639-1 language code (e.g., 'fi') to Google Cloud language code (e.g., 'fi-FI')
   */
  static getLanguageCodeForTTS(isoCode: string): string {
    const languageMap: Record<string, string> = {
      'fi': 'fi-FI', // Finnish
      'en': 'en-US', // English
      'sv': 'sv-SE', // Swedish
      'de': 'de-DE', // German
      'fr': 'fr-FR', // French
      'es': 'es-ES', // Spanish
      'it': 'it-IT', // Italian
      'pt': 'pt-PT', // Portuguese
      'ru': 'ru-RU', // Russian
      'ja': 'ja-JP', // Japanese
      'ko': 'ko-KR', // Korean
      'zh': 'zh-CN', // Chinese
    }

    return languageMap[isoCode] || 'en-US'
  }
}

// Export singleton instance
export const ttsService = new TTSService()
