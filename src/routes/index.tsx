import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { UrlForm } from '../components/UrlForm'
import { getRecentProjectsFn } from '../server/functions'
import type { Project } from '../lib/schemas'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [history, setHistory] = useState<Project[]>([])

  useEffect(() => {
    getRecentProjectsFn().then((r) => setHistory(r.projects)).catch(() => {})
  }, [])

  const done = history.filter((p) => p.status === 'done')
  const failed = history.filter((p) => p.status === 'error')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            AI-powered ad generation
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">url-to-ad</h1>
          <p className="mt-3 text-gray-500 text-base max-w-sm mx-auto">
            Paste any website URL and get ready-to-use Facebook ad creatives in seconds.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 mb-5">
          <UrlForm />
        </div>

        {/* How it works */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs text-gray-400 mb-10">
          <Step n={1} label="Paste URL" />
          <Arrow />
          <Step n={2} label="Extract brand" />
          <Arrow />
          <Step n={3} label="Generate ads" />
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recent projects
            </p>
            <div className="space-y-2">
              {done.map((p) => (
                <HistoryItem key={p.id} project={p} />
              ))}
              {failed.map((p) => (
                <HistoryItem key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function HistoryItem({ project }: { project: Project }) {
  const hostname = (() => {
    try { return new URL(project.url).hostname.replace('www.', '') }
    catch { return project.url }
  })()

  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const isError = project.status === 'error'

  return (
    <Link
      to="/p/$projectId"
      params={{ projectId: project.id }}
      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full shrink-0 ${isError ? 'bg-red-400' : 'bg-green-400'}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
            {hostname}
          </p>
          <p className="text-xs text-gray-400 truncate max-w-xs">{project.url}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-xs text-gray-400 hidden sm:block">{date}</span>
        <span className="text-gray-300 group-hover:text-blue-400 transition-colors">→</span>
      </div>
    </Link>
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

