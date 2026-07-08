import Groq from 'groq-sdk'
import { z } from 'zod'
import {
  AdDraftsSchema,
  BrandProfileSchema,
  type AdDraft,
  type BrandProfile,
} from '../lib/schemas'
import { GROQ_COST_PER_1M_INPUT, GROQ_COST_PER_1M_OUTPUT, GROQ_MODEL } from '../lib/constants'

export interface LLMResult<T> {
  data: T
  tokensIn: number
  tokensOut: number
  estCostUsd: number
  ms: number
}

function getGroq(): Groq {
  const key = process.env['GROQ_API_KEY']
  if (!key) throw new Error('Missing GROQ_API_KEY')
  return new Groq({ apiKey: key })
}

function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * GROQ_COST_PER_1M_INPUT +
    (tokensOut / 1_000_000) * GROQ_COST_PER_1M_OUTPUT
}

async function callWithRetry<T>(
  groq: Groq,
  messages: Groq.Chat.ChatCompletionMessageParam[],
  schema: z.ZodType<T>,
): Promise<{ data: T; usage: { prompt_tokens: number; completion_tokens: number } }> {
  async function attempt(extraMessages: Groq.Chat.ChatCompletionMessageParam[]): Promise<{
    raw: string
    usage: { prompt_tokens: number; completion_tokens: number }
  }> {
    const res = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [...messages, ...extraMessages],
    })
    return {
      raw: res.choices[0]?.message?.content ?? '{}',
      usage: {
        prompt_tokens: res.usage?.prompt_tokens ?? 0,
        completion_tokens: res.usage?.completion_tokens ?? 0,
      },
    }
  }

  const first = await attempt([])
  const parsed = schema.safeParse(JSON.parse(first.raw))
  if (parsed.success) {
    return { data: parsed.data, usage: first.usage }
  }

  // One retry with the validation error context
  const retry = await attempt([
    { role: 'assistant', content: first.raw },
    {
      role: 'user',
      content: `Your response failed validation: ${parsed.error.message}\nPlease fix it and respond with valid JSON only.`,
    },
  ])
  const reparsed = schema.safeParse(JSON.parse(retry.raw))
  if (!reparsed.success) {
    throw new Error(`LLM schema validation failed after retry: ${reparsed.error.message}`)
  }
  return {
    data: reparsed.data,
    usage: {
      prompt_tokens: first.usage.prompt_tokens + retry.usage.prompt_tokens,
      completion_tokens: first.usage.completion_tokens + retry.usage.completion_tokens,
    },
  }
}

export async function buildBrandProfile(
  pageText: string,
  title: string,
  description: string,
): Promise<LLMResult<BrandProfile>> {
  const groq = getGroq()
  const t0 = Date.now()

  const systemPrompt = `You extract brand profiles from website content.
Use ONLY facts present in the provided content.
If information is not present, output exactly "not found" for that field.
Never invent facts. Respond with valid JSON matching this exact schema:
{
  "what_they_do": "string or \\"not found\\"",
  "target_audience": "string or \\"not found\\"",
  "value_proposition": "string or \\"not found\\"",
  "tone_of_voice": "string or \\"not found\\"",
  "color_palette": ["#hex", ...],
  "palette_source": "extracted" | "llm_suggested"
}
For color_palette, extract hex colors if mentioned or visible in meta; otherwise suggest a minimal 2-3 color palette that fits the tone and flag palette_source as "llm_suggested".`

  const userContent = `Page title: ${title}
Meta description: ${description}

Page content (up to 10k chars):
${pageText}`

  const { data, usage } = await callWithRetry(groq, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], BrandProfileSchema)

  return {
    data,
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
    estCostUsd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    ms: Date.now() - t0,
  }
}

// Wraps the LLM ad-array response: Groq JSON mode requires a top-level object
const AdDraftsResponseSchema = z.object({ ads: AdDraftsSchema })

export async function generateAds(
  brandProfile: BrandProfile,
  imageCandidates: string[],
): Promise<LLMResult<AdDraft[]>> {
  const groq = getGroq()
  const t0 = Date.now()

  const imageList = imageCandidates
    .map((url, i) => `${i}: ${url}`)
    .join('\n')

  const systemPrompt = `You are an expert copywriter creating Facebook ad creatives.
Use ONLY the facts from the provided brand profile — do not invent claims.
Generate exactly 3 distinct ad variations. Each ad must feel different in angle or tone.
Respond with valid JSON: { "ads": [ ...3 ad objects... ] }
Each ad object: { "idea": "short creative concept", "primary_text": "...", "headline": "...", "description": "...", "cta": "Learn More|Sign Up|Get Started|Shop Now|etc", "image_index": <integer 0-based index from the list, or null> }`

  const userContent = `Brand profile:
${JSON.stringify(brandProfile, null, 2)}

Available images (use image_index to pick one per ad, or null):
${imageList || 'No images available'}`

  const { data, usage } = await callWithRetry(groq, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], AdDraftsResponseSchema)

  return {
    data: data.ads,
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
    estCostUsd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    ms: Date.now() - t0,
  }
}

export async function regenerateSingleAd(
  brandProfile: BrandProfile,
  imageCandidates: string[],
  otherAdsCopy: Array<{ headline: string; primary_text: string }>,
): Promise<LLMResult<AdDraft>> {
  const groq = getGroq()
  const t0 = Date.now()

  const imageList = imageCandidates.map((url, i) => `${i}: ${url}`).join('\n')
  const otherCopy = otherAdsCopy
    .map((a, i) => `Ad ${i + 1}: headline="${a.headline}" | text="${a.primary_text}"`)
    .join('\n')

  const systemPrompt = `You are an expert copywriter creating one new Facebook ad creative.
Use ONLY facts from the provided brand profile. Make this ad DISTINCT from the others listed.
Respond with valid JSON: { "ads": [ <one ad object> ] }
Ad object: { "idea": "...", "primary_text": "...", "headline": "...", "description": "...", "cta": "...", "image_index": <int or null> }`

  const userContent = `Brand profile:
${JSON.stringify(brandProfile, null, 2)}

Existing ads (make yours different):
${otherCopy}

Available images:
${imageList || 'No images available'}`

  const { data, usage } = await callWithRetry(groq, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], AdDraftsResponseSchema)

  const single = data.ads[0]
  if (!single) throw new Error('LLM returned no ad')

  return {
    data: single,
    tokensIn: usage.prompt_tokens,
    tokensOut: usage.completion_tokens,
    estCostUsd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    ms: Date.now() - t0,
  }
}
