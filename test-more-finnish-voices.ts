/**
 * Test additional Finnish TTS voice variations
 */

import { config } from 'dotenv'
import { ttsService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

const testText = "Tervetuloa tutustumaan fysiikan peruskäsitteisiin, jotka liittyvät liikkeen kuvaamiseen ja siihen vaikuttaviin tekijöihin."

// Try additional Finnish voice variations
const additionalVoices = [
  'fi-FI-Standard-B',
  'fi-FI-Standard-C',
  'fi-FI-Standard-D',
  'fi-FI-Wavenet-B',
  'fi-FI-Wavenet-C',
]

async function testVoices() {
  console.log('🎙️  Testing Additional Finnish TTS Voice Variations\n')
  console.log('=' .repeat(80))

  const results = []

  for (const voiceName of additionalVoices) {
    try {
      console.log(`\n🔊 Testing voice: ${voiceName}`)

      const startTime = Date.now()

      const audioResult = await ttsService.generateAudio(testText, {
        languageCode: 'fi-FI',
        voiceName: voiceName,
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
      })

      const duration = Date.now() - startTime

      // Save to Desktop
      const fileName = `finnish-voice-${voiceName.replace(/[^a-zA-Z0-9]/g, '-')}.mp3`
      const outputPath = path.join('/Users/joakimachren/Desktop', fileName)
      fs.writeFileSync(outputPath, audioResult.audioBuffer)

      console.log('✅ SUCCESS - Saved to:', fileName)

      results.push({
        voice: voiceName,
        success: true,
        file: fileName
      })

    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : String(error))
      results.push({
        voice: voiceName,
        success: false
      })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  const successful = results.filter(r => r.success)
  console.log(`✅ Found ${successful.length} additional voices`)
  successful.forEach(r => console.log(`   - ${r.voice}`))
  console.log('='.repeat(80))
}

testVoices().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
