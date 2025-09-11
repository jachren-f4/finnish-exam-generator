import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

const DIAGNOSTIC_BUCKET = 'diagnostic-images'

// Service role client for storage operations (bypasses RLS)
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

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

      // Use service role client to bypass RLS
      const serviceClient = getServiceRoleClient()
      
      const { data, error } = await serviceClient.storage
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
      const { data: urlData } = serviceClient.storage
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

      // Use service role client to bypass RLS
      const serviceClient = getServiceRoleClient()
      
      const { error } = await serviceClient.storage
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
    return process.env.NEXT_PUBLIC_DIAGNOSTIC_MODE === 'true'
  }
}