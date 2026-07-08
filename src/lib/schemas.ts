import { z } from 'zod'

// ─── Brand Profile ────────────────────────────────────────────────────────────

export const BrandProfileSchema = z.object({
  what_they_do: z.string(),
  target_audience: z.string(),
  value_proposition: z.string(),
  tone_of_voice: z.string(),
  color_palette: z.array(z.string()),
  palette_source: z.enum(['extracted', 'llm_suggested']),
})

export type BrandProfile = z.infer<typeof BrandProfileSchema>

// ─── Ad ───────────────────────────────────────────────────────────────────────

export const AdSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  idea: z.string(),
  primary_text: z.string(),
  headline: z.string(),
  description: z.string(),
  cta: z.string(),
  image_url: z.string().nullable(),
  position: z.number().int().min(1).max(3),
  updated_at: z.string(),
})

export type Ad = z.infer<typeof AdSchema>

// LLM output (no id/project_id yet)
export const AdDraftSchema = z.object({
  idea: z.string(),
  primary_text: z.string(),
  headline: z.string(),
  description: z.string(),
  cta: z.string(),
  image_index: z.number().int().nullable(),
})

export type AdDraft = z.infer<typeof AdDraftSchema>

export const AdDraftsSchema = z.array(AdDraftSchema).min(1).max(3)

// ─── Project ──────────────────────────────────────────────────────────────────

export const ProjectStatusSchema = z.enum([
  'pending',
  'extracting',
  'generating',
  'done',
  'error',
])

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

export const MetricsSchema = z.object({
  fetch_ms: z.number(),
  render_used: z.boolean(),
  llm_ms: z.number(),
  tokens_in: z.number(),
  tokens_out: z.number(),
  est_cost_usd: z.number(),
})

export type Metrics = z.infer<typeof MetricsSchema>

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  status: ProjectStatusSchema,
  error_message: z.string().nullable(),
  brand_profile: BrandProfileSchema.nullable(),
  image_candidates: z.array(z.string()).nullable(),
  metrics: MetricsSchema.nullable(),
  created_at: z.string(),
})

export type Project = z.infer<typeof ProjectSchema>

// ─── API payloads ─────────────────────────────────────────────────────────────

export const CreateProjectInputSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

export const UpdateAdInputSchema = z.object({
  adId: z.string().uuid(),
  fields: z.object({
    primary_text: z.string().optional(),
    headline: z.string().optional(),
    description: z.string().optional(),
    cta: z.string().optional(),
    image_url: z.string().nullable().optional(),
  }),
})
