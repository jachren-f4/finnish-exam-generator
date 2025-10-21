/**
 * Test script for Google Cloud TTS service
 * Tests TTS audio generation independently
 */

import { config } from 'dotenv'
import { ttsService, TTSService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

async function testTTS() {
  console.log('🚀 Testing Google Cloud TTS Service\n')
  console.log('================================================================================')

  // Check environment variable
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON

  if (!credentialsJson) {
    console.error('❌ ERROR: GOOGLE_CLOUD_CREDENTIALS_JSON environment variable not set')
    process.exit(1)
  }

  console.log('✅ Environment variable GOOGLE_CLOUD_CREDENTIALS_JSON found')
  console.log(`   Length: ${credentialsJson.length} characters\n`)

  // Try to parse the JSON
  try {
    const credentials = JSON.parse(credentialsJson)
    console.log('✅ Credentials JSON parsed successfully')
    console.log(`   Project ID: ${credentials.project_id}`)
    console.log(`   Client Email: ${credentials.client_email}`)
    console.log(`   Private Key: ${credentials.private_key ? 'Present (' + credentials.private_key.length + ' chars)' : 'MISSING'}\n`)
  } catch (error) {
    console.error('❌ ERROR: Failed to parse GOOGLE_CLOUD_CREDENTIALS_JSON as JSON')
    console.error(error)
    process.exit(1)
  }

  // Test Finnish text (from physics lessons about motion)
  const testText = `
Tämä oppimateriaali käsittelee liikkeen perusteita, keskittyen erityisesti nopeuteen ja voimavaikutuksiin.
Liike on olennainen osa fysiikkaa ja arkielämäämme. Ymmärtämällä liikkeen periaatteita voimme selittää
monia ilmiöitä ympärillämme.

Liikkeen peruskäsitteitä ovat nopeus ja voimavaikutus. Nopeus kuvaa kappaleen liikkeen suuruutta ja suuntaa.
Se määritellään matkana, jonka kappale kulkee tietyssä ajassa. Nopeuden perusyksikkö SI-järjestelmässä on
metri sekunnissa (m/s).
  `.trim()

  console.log('📝 Test Text:')
  console.log(`   Length: ${testText.length} characters`)
  console.log(`   Word count: ${testText.split(/\s+/).length} words`)
  console.log(`   Preview: ${testText.substring(0, 100)}...\n`)

  try {
    console.log('⏳ Calling Google Cloud TTS API...\n')
    const startTime = Date.now()

    // Generate audio
    const languageCode = TTSService.getLanguageCodeForTTS('fi')
    console.log(`   Language code: ${languageCode}`)

    const audioResult = await ttsService.generateAudio(testText, {
      languageCode,
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
    })

    const duration = Date.now() - startTime

    console.log('\n✅ TTS API call successful!')
    console.log(`   Generation time: ${duration}ms`)
    console.log(`   Audio buffer size: ${audioResult.audioBuffer.length} bytes (~${(audioResult.audioBuffer.length / 1024).toFixed(1)} KB)`)
    console.log(`   Voice used: ${audioResult.metadata.voiceUsed}`)
    console.log(`   Estimated duration: ${audioResult.metadata.durationSeconds} seconds`)
    console.log(`   File size: ${audioResult.metadata.fileSizeBytes} bytes`)

    // Save to file for testing
    const outputPath = path.join('/tmp', 'test-tts-output.mp3')
    fs.writeFileSync(outputPath, audioResult.audioBuffer)
    console.log(`\n💾 Audio saved to: ${outputPath}`)
    console.log('   You can play this file to verify audio quality')

    console.log('\n================================================================================')
    console.log('✅ TTS TEST PASSED - Service is working correctly!')

  } catch (error) {
    console.error('\n❌ TTS TEST FAILED')
    console.error('================================================================================')
    console.error('Error details:')
    console.error(error)

    if (error instanceof Error) {
      console.error('\nError message:', error.message)
      console.error('Error stack:', error.stack)
    }

    process.exit(1)
  }
}

// Run test
testTTS().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
