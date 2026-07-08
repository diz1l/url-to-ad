import { createFileRoute } from '@tanstack/react-router'
import { UrlForm } from '../components/UrlForm'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900">url-to-ad</h1>
        <p className="mt-3 text-gray-500 text-lg max-w-md">
          Paste any website URL and get Facebook-style ad creatives in seconds.
        </p>
      </div>
      <UrlForm />
    </main>
  )
}
