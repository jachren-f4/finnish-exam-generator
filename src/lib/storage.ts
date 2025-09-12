import { supabase } from './supabase'

const DIAGNOSTIC_BUCKET = 'diagnostic-images'

export interface ImageUploadResult {
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
}