import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createProjectFn } from '../server/functions'

export function UrlForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const trimmed = url.trim()
      // Ensure URL has protocol
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      const { projectId } = await createProjectFn({ data: { url: normalized } })
      navigate({ to: '/p/$projectId', params: { projectId } })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 transition"
          required
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-w-[140px]"
        >
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </span>
          ) : 'Generate Ads'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </form>
  )
}
