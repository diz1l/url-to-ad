import { PIPELINE_TIMEOUT_MS } from '../lib/constants'
import type { Metrics } from '../lib/schemas'
import * as db from './db'
import { extractPage } from './extraction'
import { buildBrandProfile, generateAds } from './llm'

export async function runPipeline(projectId: string, url: string): Promise<void> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), PIPELINE_TIMEOUT_MS)

  try {
    // ── Stage 1: Extraction ────────────────────────────────────────────────
    await db.updateProjectStatus(projectId, 'extracting')

    const fetchStart = Date.now()
    const extraction = await extractPage(url)
    const fetchMs = Date.now() - fetchStart

    // Check budget
    if (abort.signal.aborted) {
      throw new Error('Pipeline exceeded 60 s budget during extraction.')
    }

    // ── Stage 2: LLM ──────────────────────────────────────────────────────
    await db.updateProjectStatus(projectId, 'generating')

    const llmStart = Date.now()
    const profileResult = await buildBrandProfile(
      extraction.bodyText,
      extraction.title,
      extraction.description,
    )

    if (abort.signal.aborted) {
      throw new Error('Pipeline exceeded 60 s budget during brand profile generation.')
    }

    const adsResult = await generateAds(profileResult.data, extraction.imageCandidates)

    if (abort.signal.aborted) {
      throw new Error('Pipeline exceeded 60 s budget during ad generation.')
    }

    const llmMs = Date.now() - llmStart

    // ── Stage 3: Persist ──────────────────────────────────────────────────
    const adDrafts = adsResult.data.map((draft, i) => ({
      idea: draft.idea,
      primary_text: draft.primary_text,
      headline: draft.headline,
      description: draft.description,
      cta: draft.cta,
      image_url: draft.image_index !== null
        ? (extraction.imageCandidates[draft.image_index] ?? null)
        : null,
      position: i + 1,
    }))

    await db.insertAds(projectId, adDrafts)

    const metrics: Metrics = {
      fetch_ms: fetchMs,
      render_used: extraction.renderUsed,
      llm_ms: llmMs,
      tokens_in: profileResult.tokensIn + adsResult.tokensIn,
      tokens_out: profileResult.tokensOut + adsResult.tokensOut,
      est_cost_usd: profileResult.estCostUsd + adsResult.estCostUsd,
    }

    await db.updateProjectStatus(projectId, 'done', {
      brand_profile: profileResult.data,
      image_candidates: extraction.imageCandidates,
      metrics,
      error_message: extraction.partial ? extraction.partialReason ?? null : null,
    })
  } catch (err) {
    await db.updateProjectStatus(projectId, 'error', {
      error_message: (err as Error).message,
    })
  } finally {
    clearTimeout(timer)
  }
}
