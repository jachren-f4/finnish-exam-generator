/**
 * Test script to compare multiple Finnish TTS voices
 */

import { config } from 'dotenv'
import { ttsService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

const testText = "Tervetuloa tutustumaan fysiikan peruskäsitteisiin, jotka liittyvät liikkeen kuvaamiseen ja siihen vaikuttaviin tekijöihin."

// Finnish voices available in Google Cloud TTS
const finnishVoices = [
  'fi-FI-Standard-A',     // Female, Standard quality
  'fi-FI-Wavenet-A',      // Female, WaveNet (higher quality)
  'fi-FI-Neural2-A',      // Female, Neural2 (highest quality if available)
  'fi-FI-Studio-A',       // Studio quality (if available)
  'fi-FI-Polyglot-1',     // Polyglot voice (if available)
]

async function testVoices() {
  console.log('🎙️  Testing Finnish TTS Voices\n')
  console.log('=' .repeat(80))
  console.log('Test Text:', testText)
  console.log('=' .repeat(80))
  console.log()

  const results = []

  for (const voiceName of finnishVoices) {
    try {
      console.log(`\n🔊 Testing voice: ${voiceName}`)
      console.log('-'.repeat(80))

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

      console.log('✅ SUCCESS')
      console.log(`   Generation time: ${duration}ms`)
      console.log(`   Audio size: ${audioResult.audioBuffer.length} bytes (~${(audioResult.audioBuffer.length / 1024).toFixed(1)} KB)`)
      console.log(`   Saved to: ${fileName}`)

      results.push({
        voice: voiceName,
        success: true,
        duration,
        size: audioResult.audioBuffer.length,
        file: fileName
      })

    } catch (error) {
      console.log('❌ FAILED')
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)

      results.push({
        voice: voiceName,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach(r => {
    console.log(`   - ${r.voice}: ${r.duration}ms, ${(r.size! / 1024).toFixed(1)} KB`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach(r => {
      console.log(`   - ${r.voice}: ${r.error}`)
    })
  }

  console.log('\n💾 All successful audio files saved to Desktop')
  console.log('   Listen to each one to compare voice quality!\n')
}

testVoices().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
