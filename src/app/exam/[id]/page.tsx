'use client'

export default function ExamPagePlaceholder() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
        <div className="text-center">
          <div className="text-blue-500 text-5xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Huolto käynnissä</h1>
          <p className="text-gray-600 mb-4">
            Koeliittymää päivitetään parhaillaan. Palaa myöhemmin.
          </p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Palaa etusivulle
          </button>
        </div>
      </div>
    </div>
  )
}