import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { CreateProjectInputSchema, UpdateAdInputSchema } from '../lib/schemas'
import * as db from './db'
import { runPipeline } from './pipeline'
import { regenerateSingleAd } from './llm'

// ── Create project + run pipeline synchronously ───────────────────────────────
// Fire-and-forget doesn't work in Cloudflare Workers (execution context closes
// after the response is sent). We run the pipeline inline and return when done.
export const createProjectFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => CreateProjectInputSchema.parse(data))
  .handler(async ({ data }) => {
    const project = await db.createProject(data.url)
    await runPipeline(project.id, project.url)
    return { projectId: project.id }
  })

// ── Poll project status ────────────────────────────────────────────────────────
export const getProjectFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => z.object({ projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const result = await db.getProjectWithAds(data.projectId)
    if (!result) throw new Error('Project not found')
    return result
  })

// ── Update a single ad field ───────────────────────────────────────────────────
export const updateAdFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => UpdateAdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const ad = await db.updateAd(data.adId, data.fields)
    return { ad }
  })

// ── Regenerate a single ad ─────────────────────────────────────────────────────
export const regenerateAdFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ adId: z.string().uuid(), projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const result = await db.getProjectWithAds(data.projectId)
    if (!result) throw new Error('Project not found')

    const { project, ads } = result
    if (!project.brand_profile) throw new Error('Brand profile not available')

    const otherAds = ads
      .filter((a) => a.id !== data.adId)
      .map((a) => ({ headline: a.headline, primary_text: a.primary_text }))

    const { data: draft } = await regenerateSingleAd(
      project.brand_profile,
      project.image_candidates ?? [],
      otherAds,
    )

    const updated = await db.replaceAd(data.adId, {
      idea: draft.idea,
      primary_text: draft.primary_text,
      headline: draft.headline,
      description: draft.description,
      cta: draft.cta,
      image_url:
        draft.image_index !== null
          ? ((project.image_candidates ?? [])[draft.image_index] ?? null)
          : null,
    })

    return { ad: updated }
  })

// ── Get recent projects (history) ─────────────────────────────────────────────
export const getRecentProjectsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const projects = await db.getRecentProjects(20)
    return { projects }
  })
