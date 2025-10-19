/**
 * Create 5th voice variant with different speaking rate
 */

import { config } from 'dotenv'
import { ttsService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const testText = "Tervetuloa tutustumaan fysiikan peruskäsitteisiin, jotka liittyvät liikkeen kuvaamiseen ja siihen vaikuttaviin tekijöihin."

async function testVariant() {
  console.log('🎙️  Creating 5th voice variant (Wavenet-A with slower rate)\n')

  const audioResult = await ttsService.generateAudio(testText, {
    languageCode: 'fi-FI',
    voiceName: 'fi-FI-Wavenet-A',
    audioEncoding: 'MP3',
    speakingRate: 0.9,  // Slightly slower for comparison
    pitch: 0.0,
  })

  const fileName = 'finnish-voice-fi-FI-Wavenet-A-slow.mp3'
  const outputPath = path.join('/Users/joakimachren/Desktop', fileName)
  fs.writeFileSync(outputPath, audioResult.audioBuffer)

  console.log('✅ SUCCESS - Saved to:', fileName)
  console.log('   (Same voice as Wavenet-A but 10% slower)')
}

testVariant().catch(console.error)
