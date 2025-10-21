/**
 * Quick TTS test with simple Finnish phrase
 */

import { config } from 'dotenv'
import { ttsService, TTSService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

async function testQuickTTS() {
  console.log('🚀 Quick TTS Test\n')

  const testText = "Hei beibi anna mulle piskaa."

  console.log('📝 Test Text:', testText)
  console.log('📝 Length:', testText.length, 'characters\n')

  try {
    console.log('⏳ Generating audio...')
    const startTime = Date.now()

    const languageCode = TTSService.getLanguageCodeForTTS('fi')

    const audioResult = await ttsService.generateAudio(testText, {
      languageCode,
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
    })

    const duration = Date.now() - startTime

    console.log('✅ Audio generated successfully!')
    console.log('   Generation time:', duration, 'ms')
    console.log('   Audio size:', audioResult.audioBuffer.length, 'bytes')
    console.log('   Voice used:', audioResult.metadata.voiceUsed)

    // Save to Desktop
    const outputPath = path.join('/Users/joakimachren/Desktop', 'test-finnish-tts.mp3')
    fs.writeFileSync(outputPath, audioResult.audioBuffer)
    console.log('\n💾 Audio saved to:', outputPath)
    console.log('   You can play this file now!')

  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error)
    process.exit(1)
  }
}

testQuickTTS().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
