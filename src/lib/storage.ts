import { supabase, supabaseAdmin } from './supabase'

const DIAGNOSTIC_BUCKET = 'diagnostic-images'
const AUDIO_SUMMARIES_BUCKET = 'audio-summaries'

export interface ImageUploadResult {
  url: string | null
  error: string | null
}

export interface AudioUploadResult {
  url: string | null
  error: string | null
}

export class SupabaseStorageManager {
  static async uploadDiagnosticImage(
    buffer: Buffer, 
    examId: string, 
    imageIndex: number,
    mimeType: string = 'image/jpeg'
  ): Promise<ImageUploadResult> {
    try {
      const timestamp = Date.now()
      const filename = `${examId}_${timestamp}_${imageIndex}.jpg`

      const { data, error } = await supabase.storage
        .from(DIAGNOSTIC_BUCKET)
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: false
        })

      if (error) {
        console.error('Storage upload error:', error)
        return { url: null, error: error.message }
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(DIAGNOSTIC_BUCKET)
        .getPublicUrl(data.path)

      return { url: urlData.publicUrl, error: null }
    } catch (err) {
      console.error('Storage upload exception:', err)
      return { url: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  static async uploadMultipleDiagnosticImages(
    imageBuffers: Buffer[], 
    examId: string
  ): Promise<string[]> {
    const uploadPromises = imageBuffers.map((buffer, index) => 
      this.uploadDiagnosticImage(buffer, examId, index)
    )

    const results = await Promise.all(uploadPromises)
    
    // Filter successful uploads and return URLs
    return results
      .filter(result => result.url !== null)
      .map(result => result.url!)
  }

  static async deleteDiagnosticImages(urls: string[]): Promise<void> {
    try {
      // Extract filenames from URLs
      const filenames = urls.map(url => {
        const parts = url.split('/')
        return parts[parts.length - 1]
      })

      const { error } = await supabase.storage
        .from(DIAGNOSTIC_BUCKET)
        .remove(filenames)

      if (error) {
        console.error('Failed to delete diagnostic images:', error)
      }
    } catch (err) {
      console.error('Exception during image deletion:', err)
    }
  }

  static isDiagnosticModeEnabled(): boolean {
    return false // Disabled for performance - OCR diagnostic step was taking 168 seconds
  }

  /**
   * Upload audio summary file to Supabase Storage
   * @param audioBuffer - MP3 audio file buffer
   * @param examId - Exam ID for filename
   * @param languageCode - Language code (e.g., 'fi', 'en')
   * @returns Public URL to the uploaded audio file
   */
  static async uploadAudioSummary(
    audioBuffer: Buffer,
    examId: string,
    languageCode: string
  ): Promise<AudioUploadResult> {
    try {
      if (!supabaseAdmin) {
        console.error('[Storage] Supabase admin client not available')
        return { url: null, error: 'Supabase admin client not configured' }
      }

      const timestamp = Date.now()
      const filename = `${examId}_${languageCode}_${timestamp}.mp3`

      console.log('[Storage] Uploading audio file:', filename)
      console.log('[Storage] File size:', audioBuffer.length, 'bytes')

      const { data, error } = await supabaseAdmin.storage
        .from(AUDIO_SUMMARIES_BUCKET)
        .upload(filename, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
          cacheControl: '3600' // Cache for 1 hour
        })

      if (error) {
        console.error('[Storage] Audio upload error:', error)
        return { url: null, error: error.message }
      }

      // Get the public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(AUDIO_SUMMARIES_BUCKET)
        .getPublicUrl(data.path)

      console.log('[Storage] Audio uploaded successfully:', urlData.publicUrl)

      return { url: urlData.publicUrl, error: null }

    } catch (err) {
      console.error('[Storage] Audio upload exception:', err)
      return { url: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  /**
   * Delete audio summary file from Supabase Storage
   * @param url - Public URL of the audio file to delete
   */
  static async deleteAudioSummary(url: string): Promise<void> {
    try {
      if (!supabaseAdmin) {
        console.error('[Storage] Supabase admin client not available')
        return
      }

      // Extract filename from URL
      const parts = url.split('/')
      const filename = parts[parts.length - 1]

      console.log('[Storage] Deleting audio file:', filename)

      const { error } = await supabaseAdmin.storage
        .from(AUDIO_SUMMARIES_BUCKET)
        .remove([filename])

      if (error) {
        console.error('[Storage] Failed to delete audio file:', error)
      } else {
        console.log('[Storage] Audio file deleted successfully')
      }
    } catch (err) {
      console.error('[Storage] Exception during audio deletion:', err)
    }
  }
}