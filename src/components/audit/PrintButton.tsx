'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
    >
      Print / Save as PDF
    </button>
  )
}
