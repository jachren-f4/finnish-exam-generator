/**
 * Test German TTS with summary from history exam
 */

import { config } from 'dotenv'
import { ttsService, TTSService } from './src/lib/services/tts-service'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

async function testGermanTTS() {
  console.log('🚀 German TTS Test\n')

  // German summary from exam ID: 9d297296-7294-422d-9c99-041e4b2f7e2d
  const testText = `Das späte 19. und frühe 20. Jahrhundert war eine Zeit des Umbruchs und der globalen Veränderungen, geprägt vom Imperialismus und dem Streben europäischer Mächte nach weltweiter Dominanz. Dieses Zeitalter, das oft als „Wettlauf um die Welt" bezeichnet wird, führte zu einer rasanten Expansion kolonialer Reiche und legte den Grundstein für viele Konflikte, die die Weltgeschichte prägen sollten. In dieser Zeit versuchten Nationen wie Großbritannien, Frankreich und Deutschland, ihren Einfluss durch die Eroberung und Verwaltung von Territorien in Afrika, Asien und anderen Teilen der Welt auszudehnen. Dies hatte tiefgreifende Auswirkungen auf die kolonisierten Völker und veränderte die politische und wirtschaftliche Landkarte der Welt nachhaltig.

Der Imperialismus war ein komplexes Phänomen, das von verschiedenen Faktoren angetrieben wurde. Einer der Hauptgründe war der wirtschaftliche Bedarf der industrialisierten europäischen Nationen. Sie suchten nach neuen Quellen für Rohstoffe, wie Gummi, Diamanten und Metalle, die für ihre Fabriken unerlässlich waren. Gleichzeitig benötigten sie neue Absatzmärkte für ihre wachsenden Mengen an produzierten Gütern. Der politische Ehrgeiz spielte ebenfalls eine entscheidende Rolle. Europäische Mächte strebten danach, ihre globale Macht und ihren Einfluss zu vergrößern und mit ihren Rivalen Schritt zu halten. Der Besitz von Kolonien galt als Zeichen von Weltmachtstatus. Die technologische Überlegenheit der Europäer, insbesondere in Bezug auf Waffen und Transportmittel, erleichterte die Eroberung und Kontrolle über weit entfernte Gebiete. Darüber hinaus gab es auch ideologische Rechtfertigungen, wie die angebliche „zivilisatorische Mission", die besagte, dass die Europäer die Pflicht hätten, andere Völker zu „zivilisieren" und ihnen ihre Kultur und Werte zu bringen. Dies war oft eine Tarnung für die tatsächlichen wirtschaftlichen und politischen Interessen. Im Kontext des Deutschen Reiches war die Kolonialpolitik zunächst umstritten. Otto von Bismarck, der Reichskanzler, war anfangs skeptisch, erkannte aber später die Notwendigkeit, deutsche Kolonien zu erwerben, um mit anderen Großmächten konkurrieren zu können. Deutschland erwarb schließlich Kolonien wie Deutsch-Südwestafrika (heutiges Namibia) und Deutsch-Ostafrika (heutiges Tansania, Ruanda, Burundi). Die deutsche Kolonialpolitik unterschied sich oft von der britischen oder französischen, da Deutschland später in den Wettlauf einstieg und weniger Territorien erwarb. Die Verwaltung der Kolonien war oft von Ausbeutung geprägt. Die einheimische Bevölkerung wurde häufig zur Zwangsarbeit herangezogen, ihr Land wurde enteignet und ihre traditionellen Lebensweisen wurden gestört oder zerstört. Dies führte zu Widerstand, wie dem Herero-Aufstand in Deutsch-Südwestafrika, der von den deutschen Kolonialtruppen brutal niedergeschlagen wurde. Die Auswirkungen des Imperialismus waren weitreichend und prägten die Beziehungen zwischen Europa und den kolonisierten Regionen für Jahrzehnte.

Die Auswirkungen des Imperialismus sind bis heute spürbar. Ein prägnantes Beispiel ist die Aufteilung Afrikas durch die europäischen Mächte auf der Berliner Konferenz im Jahr 1884/85. Ohne Rücksicht auf ethnische oder kulturelle Grenzen wurden Gebiete willkürlich aufgeteilt, was zu späteren Konflikten und Instabilitäten führte. In Deutsch-Südwestafrika (heutiges Namibia) führte die deutsche Kolonialherrschaft zur Enteignung von Land und zur Unterdrückung der Herero und Nama. Der Herero-Aufstand von 1904 und die darauffolgende brutale Niederschlagung durch die deutschen Truppen sind ein dunkles Kapitel der Kolonialgeschichte und werden heute als Völkermord anerkannt. Die Kolonien dienten als wichtige Lieferanten von Rohstoffen für die europäische Industrie. Beispielsweise lieferte Deutsch-Südwestafrika Diamanten und andere Mineralien. Die einheimische Bevölkerung wurde oft gezwungen, in Minen oder auf Plantagen zu arbeiten, oft unter unmenschlichen Bedingungen. Die Kolonialmächte bauten auch Infrastruktur wie Eisenbahnen und Häfen, aber diese dienten primär dem Zweck, Rohstoffe aus dem Landesinneren zu den Küstenhäfen zu transportieren, um sie nach Europa zu verschiffen. Die politische Landkarte in den Kolonien wurde komplett umgestaltet. Einheimische Herrschaftssysteme wurden aufgelöst oder unter die Kontrolle der Kolonialverwaltung gestellt. Die Einführung von fremden Rechtssystemen und Verwaltungsstrukturen führte zu tiefgreifenden Veränderungen im sozialen Gefüge. Die wirtschaftliche Ausbeutung war ein zentrales Merkmal. Die Kolonien wurden in das Wirtschaftssystem der Mutterländer integriert, oft zu deren Vorteil. Dies führte zu einer einseitigen wirtschaftlichen Entwicklung, die die Kolonien von den Mutterländern abhängig machte. Die kulturellen Auswirkungen waren ebenfalls erheblich. Europäische Sprachen, Religionen und Bildungssysteme wurden eingeführt, was oft zur Verdrängung oder Verfälschung lokaler Kulturen führte.

Zusammenfassend lässt sich sagen, dass der Imperialismus im späten 19. und frühen 20. Jahrhundert eine Ära der globalen Expansion und des Wettbewerbs zwischen den europäischen Großmächten war. Angetrieben von wirtschaftlichen Interessen, politischem Ehrgeiz und einem Gefühl der Überlegenheit, eroberten und kontrollierten diese Mächte weite Teile der Welt. Dies führte zu tiefgreifenden Veränderungen in den kolonisierten Regionen, oft verbunden mit Ausbeutung, Unterdrückung und dem Verlust von Land und Kultur. Die Rivalitäten, die durch den Wettlauf um Kolonien entstanden, trugen maßgeblich zu den Spannungen bei, die schließlich zum Ausbruch des Ersten Weltkriegs führten. Das Verständnis des Imperialismus ist entscheidend, um die heutige globale politische und wirtschaftliche Ordnung sowie die komplexen Beziehungen zwischen ehemaligen Kolonialmächten und ihren ehemaligen Kolonien zu verstehen.`

  console.log('📝 Test Text (German):')
  console.log('   Topic: Imperialismus im späten 19. und frühen 20. Jahrhundert')
  console.log('   Original Length:', testText.length, 'characters')
  console.log('   Word count:', testText.split(/\s+/).length, 'words\n')

  // Truncate to fit within 5000 bytes (Google Cloud TTS limit)
  // Must check BYTE length, not character length, due to multi-byte UTF-8 characters
  const MAX_TTS_BYTES = 4900 // Use 4900 to be safe (leave 100 bytes buffer)
  let processedText = testText
  const originalByteLength = Buffer.byteLength(testText, 'utf8')

  if (originalByteLength > MAX_TTS_BYTES) {
    // Truncate by bytes, not characters
    let truncated = testText
    while (Buffer.byteLength(truncated, 'utf8') > MAX_TTS_BYTES) {
      truncated = truncated.substring(0, truncated.length - 100) // Remove 100 chars at a time
    }
    processedText = truncated
    console.log('⚠️  Summary truncated from', originalByteLength, 'bytes to', Buffer.byteLength(processedText, 'utf8'), 'bytes')
    console.log('   Character count:', testText.length, '→', processedText.length)
    console.log('   Reason: Google Cloud TTS 5000-byte limit\n')
  } else {
    console.log('✅ Summary size within TTS limit:', originalByteLength, 'bytes\n')
  }

  try {
    console.log('⏳ Generating German audio...')
    console.log('   Processing:', processedText.length, 'characters')
    const startTime = Date.now()

    // Convert 'de' to 'de-DE' for TTS
    const languageCode = TTSService.getLanguageCodeForTTS('de')
    console.log('   Language code:', languageCode)

    const audioResult = await ttsService.generateAudio(processedText, {
      languageCode,
      audioEncoding: 'MP3',
      speakingRate: 0.8, // 20% slower for educational clarity
      pitch: 0.0,
    })

    const duration = Date.now() - startTime

    console.log('\n✅ Audio generated successfully!')
    console.log('   Generation time:', duration, 'ms')
    console.log('   Audio size:', audioResult.audioBuffer.length, 'bytes (~' + (audioResult.audioBuffer.length / 1024).toFixed(1) + ' KB)')
    console.log('   Voice used:', audioResult.metadata.voiceUsed)
    console.log('   Estimated duration:', audioResult.metadata.durationSeconds, 'seconds')

    // Save to Desktop
    const outputPath = path.join('/Users/joakimachren/Desktop', 'test-german-history-tts.mp3')
    fs.writeFileSync(outputPath, audioResult.audioBuffer)
    console.log('\n💾 Audio saved to:', outputPath)
    console.log('   You can play this file now!')
    console.log('\n🎧 This is the audio that should have been generated for exam:')
    console.log('   https://exam-generator-staging.vercel.app/exam/9d297296-7294-422d-9c99-041e4b2f7e2d')

  } catch (error) {
    console.error('\n❌ Test failed:')
    console.error(error)
    process.exit(1)
  }
}

testGermanTTS().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
