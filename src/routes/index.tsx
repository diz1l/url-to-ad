import { createFileRoute } from '@tanstack/react-router'
import { UrlForm } from '../components/UrlForm'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            AI-powered ad generation
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">url-to-ad</h1>
          <p className="mt-3 text-gray-500 text-base max-w-sm mx-auto">
            Paste any website URL and get ready-to-use Facebook ad creatives in seconds.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-5">
          <UrlForm />
        </div>

        {/* How it works */}
        <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
          <Step n={1} label="Paste URL" />
          <Arrow />
          <Step n={2} label="Extract brand" />
          <Arrow />
          <Step n={3} label="Generate ads" />
        </div>
      </div>
    </main>
  )
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">{n}</span>
      <span>{label}</span>
    </div>
  )
}

function Arrow() {
  return <span className="text-gray-300">→</span>
}
