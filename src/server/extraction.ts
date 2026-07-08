import { parseHTML } from 'linkedom'
import {
  BROWSERLESS_CONTENT_URL,
  EMPTY_SHELL_THRESHOLD,
  FETCH_TIMEOUT_MS,
  MAX_IMAGE_CANDIDATES,
  MAX_TEXT_CHARS,
} from '../lib/constants'

export interface ExtractionResult {
  title: string
  description: string
  ogTitle: string
  ogImage: string | null
  bodyText: string
  imageCandidates: string[]
  renderUsed: boolean
  partial: boolean
  partialReason?: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': BROWSER_UA },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('html')) throw new Error(`Non-HTML content-type: ${ct}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRendered(url: string, token: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS * 2)
  try {
    const res = await fetch(BROWSERLESS_CONTENT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) throw new Error(`Browserless HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

function parseContent(html: string, baseUrl: string): Omit<ExtractionResult, 'renderUsed' | 'partial' | 'partialReason'> {
  const { document } = parseHTML(html)

  const title = document.querySelector('title')?.textContent?.trim() ?? ''

  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? ''

  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ?? ''

  const ogImageRaw =
    document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null
  const ogImage = ogImageRaw ? resolveUrl(baseUrl, ogImageRaw) : null

  // Visible body text: remove script/style/noscript, collapse whitespace
  const clone = document.querySelector('body')
  ;['script', 'style', 'noscript', 'svg', 'iframe'].forEach((tag) => {
    clone?.querySelectorAll(tag).forEach((el) => el.remove())
  })
  const bodyText = (clone?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS)

  // Image candidates: all <img src>, resolved, deduplicated, filtered
  const seen = new Set<string>()
  if (ogImage) seen.add(ogImage)

  const imgEls = document.querySelectorAll('img[src]')
  const imageCandidates: string[] = ogImage ? [ogImage] : []

  for (const img of Array.from(imgEls)) {
    if (imageCandidates.length >= MAX_IMAGE_CANDIDATES) break
    const src = img.getAttribute('src') ?? ''
    if (src.startsWith('data:')) continue
    const abs = resolveUrl(baseUrl, src)
    if (!abs) continue
    // drop obvious tracking pixels (1x1 patterns)
    if (abs.includes('pixel') || abs.includes('tracking') || abs.includes('beacon')) continue
    if (seen.has(abs)) continue
    seen.add(abs)
    imageCandidates.push(abs)
  }

  const description = metaDesc

  return { title, description, ogTitle, ogImage, bodyText, imageCandidates }
}

export async function extractPage(url: string): Promise<ExtractionResult> {
  const browserlessToken = process.env['BROWSERLESS_TOKEN']

  let html: string
  let renderUsed = false
  let partial = false
  let partialReason: string | undefined

  try {
    html = await fetchHtml(url)
  } catch (err) {
    throw new Error(`Could not fetch URL: ${(err as Error).message}`)
  }

  const parsed = parseContent(html, url)

  // Empty-shell heuristic
  if (parsed.bodyText.length < EMPTY_SHELL_THRESHOLD && browserlessToken) {
    try {
      const renderedHtml = await fetchRendered(url, browserlessToken)
      const reparsed = parseContent(renderedHtml, url)
      renderUsed = true
      return { ...reparsed, renderUsed: true, partial: false }
    } catch (err) {
      // Rendering failed — proceed with static HTML, flag as partial
      partial = true
      partialReason = `JS rendering failed (${(err as Error).message}); result is from static HTML only.`
    }
  } else if (parsed.bodyText.length < EMPTY_SHELL_THRESHOLD && !browserlessToken) {
    partial = true
    partialReason = 'Page appears JS-rendered but no rendering service is configured.'
  }

  return { ...parsed, renderUsed, partial, partialReason }
}
