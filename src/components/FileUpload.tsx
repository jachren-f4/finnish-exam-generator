'use client'

import { useState, useCallback } from 'react'

const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 20

export default function FileUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [customPrompt, setCustomPrompt] = useState(`Your task:
- Based on the text, generate exactly **10 exam questions in Finnish**.

CRITICAL Requirements for the questions:
- **ONLY use correct Finnish language**: All words, grammar, and sentences must be proper Finnish. Do not use Swedish, English, or made-up words.
- **Verify OCR accuracy**: If the source text contains non-Finnish words or OCR errors, interpret the context and use correct Finnish equivalents.
- **Perfect grammar**: Use correct Finnish grammar, spelling, and sentence structure. No broken fragments or incomplete sentences.
- **Topic relevance**: Only create questions directly related to the main topic and content of the text.
- **Varied question types**: Use multiple choice, true/false, short answer, fill-in-the-blank in balanced proportions.
- **Appropriate difficulty**: Target elementary/middle school students (ages 7-15).
- **Complete answers**: Include correct answers and explanations for every question.

Output format:
Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text in Finnish",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation in Finnish"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement in Finnish",
      "correct_answer": true,
      "explanation": "Brief explanation in Finnish"
    },
    {
      "id": 3,
      "type": "short_answer",
      "question": "Question in Finnish",
      "correct_answer": "Expected answer",
      "explanation": "Brief explanation in Finnish"
    }
  ],
  "topic": "Brief description of the main topic covered",
  "difficulty": "elementary|middle_school|high_school"
}

Important: Return only the JSON object. Do not include any additional explanations or markdown formatting.`)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return `${file.name}: Unsupported file type. Please use JPEG, PNG, WebP, or HEIC.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum size is 10MB.`
    }
    return null
  }

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const errors: string[] = []
    const validFiles: File[] = []

    if (files.length + fileArray.length > MAX_FILES) {
      errors.push(`Cannot upload more than ${MAX_FILES} files total.`)
      return
    }

    fileArray.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(error)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
  }, [files.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      // Create form data for mobile API endpoint
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })
      
      // Add custom prompt if provided
      if (customPrompt.trim()) {
        formData.append('prompt', customPrompt.trim())
      }

      const response = await fetch('/api/mobile/exam-questions', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Request failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Exam creation successful:', result)
      
      // Clear files after successful upload
      setFiles([])
      
      // Check if we got exam URLs
      if (result.exam_url && result.exam_id) {
        // Redirect to exam page
        window.location.href = result.exam_url
      } else {
        alert('Exam created successfully, but no URL was returned. Please check the console for details.')
      }
      
    } catch (error) {
      console.error('Process error:', error)
      alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Custom Prompt Field */}
      <div>
        <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Prompt Context (Optional)
        </label>
        <textarea
          id="custom-prompt"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400"
          placeholder="e.g., Generate 10 exam questions in Finnish based on the textbook content. Include multiple choice and open-ended questions with correct answers..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add specific context or instructions for Gemini to improve OCR accuracy and relevance.
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label
              htmlFor="file-upload"
              className="cursor-pointer rounded-md bg-white dark:bg-gray-800 font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
            >
              <span>Upload files</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.heic"
                onChange={handleChange}
              />
            </label>
            <p className="pl-1 inline">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, HEIC up to 10MB each (max {MAX_FILES} files)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Selected Files ({files.length}/{MAX_FILES})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-gray-300 dark:border-gray-600 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 flex-shrink-0 h-5 w-5 text-gray-400 hover:text-red-500"
                    onClick={() => removeFile(index)}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Generate Finnish Exam'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}