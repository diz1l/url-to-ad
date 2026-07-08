import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjectFn } from '../../server/functions'
import type { Ad, Project } from '../../lib/schemas'
import { AdCard } from '../../components/AdCard'
import { BrandProfilePanel } from '../../components/BrandProfilePanel'

export const Route = createFileRoute('/p/$projectId')({ component: ProjectPage })

function ProjectPage() {
  const { projectId } = Route.useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const result = await getProjectFn({ data: { projectId } })
      setProject(result.project)
      setAds(result.ads)

      // Keep polling while still processing
      if (result.project.status === 'pending' || result.project.status === 'extracting' || result.project.status === 'generating') {
        pollRef.current = setTimeout(load, 1500)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }, [projectId])

  useEffect(() => {
    load()
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [load])

  function updateAd(updated: Ad) {
    setAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">Error</p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            ← Try another URL
          </button>
        </div>
      </main>
    )
  }

  if (!project) {
    return <FullPageSpinner label="Loading…" />
  }

  if (project.status === 'pending' || project.status === 'extracting') {
    return <FullPageSpinner label="Extracting page content…" />
  }

  if (project.status === 'generating') {
    return <FullPageSpinner label="Generating ad creatives…" />
  }

  if (project.status === 'error') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">Generation failed</p>
          <p className="text-gray-600 text-sm mt-2">{project.error_message ?? 'Unknown error.'}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            ← Try another URL
          </button>
        </div>
      </main>
    )
  }

  const metrics = project.metrics

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="text-gray-400 text-sm hover:text-gray-600">← url-to-ad</a>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs" title={project.url}>
            {project.url}
          </p>
        </div>
        {metrics && (
          <p className="text-xs text-gray-400 text-right">
            Generated in {((metrics.fetch_ms + metrics.llm_ms) / 1000).toFixed(1)} s ·{' '}
            {(metrics.tokens_in + metrics.tokens_out).toLocaleString()} tokens ·{' '}
            ~${metrics.est_cost_usd.toFixed(4)}
          </p>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {project.brand_profile && (
          <BrandProfilePanel
            profile={project.brand_profile}
            partial={!!project.error_message}
            partialReason={project.error_message}
          />
        )}

        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ad Creatives</h2>
        <div className="flex flex-wrap gap-6">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              projectId={projectId}
              imageCandidates={project.image_candidates ?? []}
              onUpdate={updateAd}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

function FullPageSpinner({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">{label}</p>
    </main>
  )
}
