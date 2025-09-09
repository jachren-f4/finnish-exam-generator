import FileUpload from '@/components/FileUpload'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Finnish Exam Question Generator
        </h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Upload textbook images and generate Finnish exam questions based on the content
        </p>
      </div>
      
      <FileUpload />
      
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">How it works:</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>• Upload textbook pages (JPEG, PNG, WebP, HEIC)</li>
          <li>• AI extracts text and generates 10 Finnish exam questions</li>
          <li>• Questions include multiple choice and open-ended formats</li>
          <li>• Correct answers provided for each question</li>
          <li>• Customizable prompts for different question types</li>
          <li>• Export results as JSONL format</li>
        </ul>
      </div>
    </div>
  )
}