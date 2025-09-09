'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CompressionSchema, GeminiUsage } from '@/types'

interface JobResult {
  jobId: string
  status: string
  completedAt?: string
  customPrompt?: string
  results: Array<{
    fileId: string
    filename: string
    rawText: string
    compressed: CompressionSchema
    processingTime: number
    geminiUsage?: GeminiUsage
  }>
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const [jobStatus, setJobStatus] = useState<string>('loading')
  const [results, setResults] = useState<JobResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<number>(0)
  const [jobId, setJobId] = useState<string>('')

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setJobId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!jobId) return

    const checkJobStatus = async () => {
      try {
        // Check job status first
        const statusResponse = await fetch(`/api/ocr/jobs/${jobId}`)
        const statusData = await statusResponse.json()
        
        setJobStatus(statusData.status)
        
        if (statusData.status === 'completed') {
          // Fetch results
          const resultsResponse = await fetch(`/api/ocr/jobs/${jobId}/results`)
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json()
            setResults(resultsData)
          } else {
            const errorData = await resultsResponse.json()
            setError(errorData.error || 'Failed to fetch results')
          }
        } else if (statusData.status === 'failed') {
          setError(statusData.error || 'Job failed')
        }
      } catch (err) {
        console.error('Error checking job status:', err)
        setError('Failed to check job status')
      }
    }

    checkJobStatus()

    // Poll for updates if job is still processing
    const interval = setInterval(() => {
      if (jobStatus === 'pending' || jobStatus === 'processing') {
        checkJobStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, jobStatus])

  const handleDownloadJSONL = async () => {
    if (!jobId) return
    
    try {
      const response = await fetch(`/api/ocr/jobs/${jobId}/jsonl`)
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ocr-results-${jobId}.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download results')
    }
  }


  const parseQuestions = (rawText: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawText)
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions
      }
    } catch {
      // If not valid JSON, return null to show raw text
    }
    return null
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error</h3>
          <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
        </div>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Start New Job
          </Link>
        </div>
      </div>
    )
  }

  if (jobStatus === 'loading' || jobStatus === 'pending' || jobStatus === 'processing') {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-6">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                {jobStatus === 'loading' ? 'Loading...' : 
                 jobStatus === 'pending' ? 'Job Pending' : 'Processing Images'}
              </h3>
              <p className="mt-2 text-blue-600 dark:text-blue-300">
                {jobStatus === 'processing' 
                  ? 'Gemini is analyzing your images and creating compressed representations...'
                  : 'Please wait while we process your request.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!results || !results.results || results.results.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">No Results</h3>
          <p className="mt-2 text-yellow-600 dark:text-yellow-300">No results found for this job.</p>
        </div>
      </div>
    )
  }

  const currentResult = results.results[selectedFile]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Generated Exam Questions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Job completed at {results.completedAt ? new Date(results.completedAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleDownloadJSONL}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              Download JSONL
            </button>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Start New Job
            </Link>
          </div>
        </div>
      </div>

      {/* Custom Prompt Display */}
      {results.customPrompt && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Processing Context</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            "{results.customPrompt}"
          </p>
        </div>
      )}

      {/* File Selector */}
      {results.results.length > 1 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Select File ({results.results.length} files)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.results.map((result, index) => (
              <button
                key={result.fileId}
                onClick={() => setSelectedFile(index)}
                className={`text-left p-3 rounded-lg border ${
                  selectedFile === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <p className="font-medium truncate">{result.filename}</p>
                <p className="text-sm text-gray-500">{result.processingTime}ms</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Display */}
      <div className="grid grid-cols-1 gap-8">

        {/* Raw JSON for Export */}
        {(() => {
          const questions = parseQuestions(currentResult.rawText)
          if (questions && questions.length > 0) {
            return (
              <div>
                <h2 className="text-xl font-semibold mb-4">Export Format (JSON)</h2>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700 dark:text-gray-300">
                    {JSON.stringify({ questions }, null, 2)}
                  </pre>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This JSON format is used in the JSONL download.
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* API Usage Statistics - FORCED FOR DEBUGGING */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Gemini API Usage {currentResult.geminiUsage ? '✅' : '❌'}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {currentResult.geminiUsage ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {currentResult.geminiUsage.promptTokenCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      ${currentResult.geminiUsage.inputCost.toFixed(6)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {currentResult.geminiUsage.candidatesTokenCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      ${currentResult.geminiUsage.outputCost.toFixed(6)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {currentResult.geminiUsage.totalTokenCount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ${currentResult.geminiUsage.estimatedCost.toFixed(6)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {currentResult.geminiUsage.model}
                    </div>
                  </div>
                </div>
                
                {/* Cost Breakdown */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cost Breakdown:</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Input ({currentResult.geminiUsage.promptTokenCount.toLocaleString()} tokens × $0.075/1M):</span>
                      <span className="font-mono">${currentResult.geminiUsage.inputCost.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Output ({currentResult.geminiUsage.candidatesTokenCount.toLocaleString()} tokens × $0.30/1M):</span>
                      <span className="font-mono">${currentResult.geminiUsage.outputCost.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-1">
                      <span>Total:</span>
                      <span className="font-mono">${currentResult.geminiUsage.estimatedCost.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  * Costs are estimates based on Gemini 1.5 Flash pricing as of 2024. Actual costs may vary.
                  {currentResult.geminiUsage?.promptTokenCount === 0 && (
                    <div className="mt-1 text-yellow-600 dark:text-yellow-400">
                      ⚠️ Using estimated token counts (Gemini API usage metadata not available)
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-red-600 dark:text-red-400 text-lg mb-2">❌ Usage Data Missing</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  geminiUsage field is: {JSON.stringify(currentResult.geminiUsage || 'undefined')}
                </div>
                <div className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono">
                  Debug: {JSON.stringify({
                    hasGeminiUsage: !!currentResult.geminiUsage,
                    resultKeys: Object.keys(currentResult),
                    processingTime: currentResult.processingTime
                  }, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compressed JSON - DISABLED FOR NOW */}
        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Compressed Representation</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{formatJson(currentResult.compressed)}</pre>
          </div>
        </div> */}
      </div>

      {/* Compression Stats - DISABLED FOR NOW */}
      {/* <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Compression Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Original Length</p>
            <p className="text-2xl font-bold">{currentResult.compressed.stats.originalLength.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compressed Length</p>
            <p className="text-2xl font-bold">{currentResult.compressed.stats.compressedLength.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compression Ratio</p>
            <p className="text-2xl font-bold">{(currentResult.compressed.stats.compressionRatio * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tokens</p>
            <p className="text-2xl font-bold">{currentResult.compressed.stats.tokenCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Phrases</p>
            <p className="text-2xl font-bold">{currentResult.compressed.stats.phraseCount}</p>
          </div>
        </div>
      </div> */}

      {/* Reconstructed Text Test - DISABLED FOR NOW */}
      {/* <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Reconstructed Text (Verification)</h2>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm">{reconstructText(currentResult.compressed)}</pre>
        </div>
      </div> */}
    </div>
  )
}