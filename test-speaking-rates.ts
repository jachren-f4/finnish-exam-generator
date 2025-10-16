/**
 * Test different TTS speaking rates for Finnish audio
 * Compare 0.9, 0.85, and 0.8 speaking rates
 */

import { config } from 'dotenv'
import { ttsService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const testText = "Tervetuloa tutustumaan fysiikan peruskäsitteisiin. Nopeuden perusyksikkö SI-järjestelmässä on metri sekunnissa (m/s)."

const speakingRates = [
  { rate: 0.75, description: '25% slower (deliberate)' },
  { rate: 0.7, description: '30% slower (very clear)' },
  { rate: 0.65, description: '35% slower (educational pace)' },
]

async function testSpeakingRates() {
  console.log('🎙️  Testing Finnish TTS Speaking Rates\n')
  console.log('Text:', testText)
  console.log('Voice: fi-FI-Standard-B (current production voice)')
  console.log('=' .repeat(80))

  for (const { rate, description } of speakingRates) {
    try {
      console.log(`\n🔊 Testing speaking rate: ${rate} - ${description}`)
      const startTime = Date.now()

      const audioResult = await ttsService.generateAudio(testText, {
        languageCode: 'fi-FI',
        voiceName: 'fi-FI-Standard-B',
        audioEncoding: 'MP3',
        speakingRate: rate,
        pitch: 0.0,
      })

      const duration = Date.now() - startTime

      // Save to Desktop
      const fileName = `finnish-speed-${rate.toFixed(2)}.mp3`
      const outputPath = path.join('/Users/joakimachren/Desktop', fileName)
      fs.writeFileSync(outputPath, audioResult.audioBuffer)

      console.log('✅ SUCCESS')
      console.log(`   File: ${fileName}`)
      console.log(`   Size: ${Math.round(audioResult.audioBuffer.length / 1024)} KB`)
      console.log(`   Generation time: ${duration}ms`)

    } catch (error) {
      console.log('❌ FAILED:', error instanceof Error ? error.message : String(error))
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ All audio samples saved to Desktop')
  console.log('\nFiles created:')
  console.log('  - finnish-speed-0.75.mp3 (25% slower)')
  console.log('  - finnish-speed-0.70.mp3 (30% slower)')
  console.log('  - finnish-speed-0.65.mp3 (35% slower)')
  console.log('\n🎧 Listen to each file and choose which sounds best!')
  console.log('='.repeat(80))
}

testSpeakingRates().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
