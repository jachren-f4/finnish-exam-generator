import { NextRequest, NextResponse } from 'next/server'

// GET /api/languages/supported - Get list of supported languages
export async function GET(_request: NextRequest) {
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fi', name: 'Finnish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'et', name: 'Estonian' },
    { code: 'no', name: 'Norwegian' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' }
  ]

  return NextResponse.json({ languages })
}