# url-to-ad — Development Plan

**Snaprime take-home assignment · Deadline: Friday 20:00 CET**

> Goal: a working end-to-end flow deployed on Cloudflare. A smaller working whole beats a big
> unfinished ambition. This document is the working plan and lives in the repo root; the final
> `README.md` for submission is written separately (structure in §8).

---

## 1. Product Overview

A web application implementing a thin vertical slice of the Snaprime core loop:

The user pastes a website URL → the app extracts page content (including JavaScript-rendered
pages) → an LLM builds a structured **brand profile** (strictly grounded in page content, no
invented facts) → an LLM generates **1–3 ad creatives** → ads are rendered as **Facebook-style
previews** where each ad can be edited inline, have its image swapped, and be regenerated
individually → all state persists in a cloud database → deployed on Cloudflare.

**Pipeline:**

```
URL → fetch HTML → (empty shell? → headless-rendering fallback) → extract text / images / meta
    → LLM call #1: brand profile (strict JSON, "not found" instead of guesses)
    → LLM call #2: 1–3 ad creatives (strict JSON)
    → persist to DB → preview UI → edit / swap image / regenerate-one
```

---

## 2. Stack & Rationale

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **TanStack Start** (required) | Assignment requirement. React-based, server functions for backend logic. |
| Language | **TypeScript (strict)** | Required. Strict typing of LLM JSON output via zod schemas. |
| Hosting | **Cloudflare Workers** (required) | Deployed via `wrangler`. |
| Database | **Supabase (Postgres)** | Cloud-hosted (required), free tier, `jsonb` fits profiles/ads well. Accessed via `@supabase/supabase-js` from server functions only. |
| LLM | **Groq API (Llama 3.3 70B)** | Fast, free tier, JSON mode support, prior production experience. Fallback: Anthropic API. |
| JS rendering | **Browserless.io** (free tier) | Hosted headless browser over HTTP — no Playwright inside a Worker. Verify free-tier limits on Day 1. Alternative: Cloudflare Browser Rendering (may require a paid plan — verify). |
| Validation | **zod** | Validate every LLM response before persisting. Invalid JSON → one retry → graceful error. |

---

## 3. Database Schema (Supabase)

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  status text not null default 'pending', -- pending | extracting | generating | done | error
  error_message text,
  brand_profile jsonb,        -- structure below
  image_candidates jsonb,     -- array of absolute image URLs found on the page
  metrics jsonb,              -- { fetch_ms, render_used, llm_ms, tokens_in, tokens_out, est_cost_usd }
  created_at timestamptz default now()
);

create table ads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  idea text,                  -- short creative concept
  primary_text text,
  headline text,
  description text,
  cta text,                   -- e.g. "Learn More", "Sign Up"
  image_url text,
  position int,               -- 1..3, stable ordering in the UI
  updated_at timestamptz default now()
);
```

**Invariant:** edits and regeneration operate on individual rows by `ads.id` — the ads array is
never rewritten wholesale. This is what guarantees the no-clobbering hard requirement.

### `brand_profile` structure

```json
{
  "what_they_do": "string | \"not found\"",
  "target_audience": "string | \"not found\"",
  "value_proposition": "string | \"not found\"",
  "tone_of_voice": "string | \"not found\"",
  "color_palette": ["#hex", "..."],
  "palette_source": "extracted | llm_suggested"
}
```

---

## 4. Execution Plan

### Day 1 (Tue evening, ~2–3 h) — Skeleton & deployment. De-risk first.

- [ ] Create the `url-to-ad` GitHub repository.
- [ ] Scaffold TanStack Start from the official Cloudflare template (TanStack Start docs →
      Hosting → Cloudflare Workers). Do not hand-roll the config.
- [ ] Configure `wrangler.jsonc`, authenticate, and **deploy a hello-world** → obtain a working
      `*.workers.dev` URL. ⚠️ The least predictable step of the whole project — do it first.
- [ ] Create the Supabase project, run the schema above in the SQL Editor.
- [ ] Secrets: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BROWSERLESS_TOKEN` —
      locally in `.dev.vars`, in production via `wrangler secret put`. `.dev.vars` is gitignored.
- [ ] Verify the rendering service (Browserless or CF Browser Rendering): sign up, make one test
      request via curl. If neither is viable on a free tier → see the fallback plan in §7.
- [ ] Project structure:
      ```
      src/
        routes/            # pages + API routes
        server/            # extraction.ts, llm.ts, db.ts — pure server-side logic
        components/        # AdCard, BrandProfile, UrlForm
        lib/               # zod schemas, types, constants
      ```
- [ ] Start `AI_NOTES.md` on day one: record effective agent prompts, agent failures, and how
      they were corrected. (This is a separately scored deliverable.)
- [ ] Commit + deploy. End of day: an empty page is live on Cloudflare.

### Day 2 (Wed, ~3–4 h) — Pipeline: extraction → profile → ads

**Extraction (`server/extraction.ts`):**
- [ ] `fetch(url)` with a **10 s timeout** (AbortController) and a realistic browser User-Agent.
- [ ] HTML parsing: `<title>`, meta description, `og:image`, `og:title`, visible body text
      (truncated to ~8–10k chars), all `<img src>` resolved to absolute URLs.
      Prefer `HTMLRewriter` (native to Workers) or `linkedom`; Cheerio may be heavy in a Worker.
- [ ] **Empty-shell heuristic:** if visible text < ~500 chars, the page is likely JS-rendered →
      fall back to Browserless (`/content` endpoint returns rendered HTML) → parse with the same code path.
- [ ] Image filtering: drop tracking pixels and `data:` URIs; keep obvious logos as separate
      candidates; cap at 8 candidates.
- [ ] Failure handling: unreachable URL / 404 / non-HTML → status `error` with a human-readable
      message. Partial extraction (e.g. rendering failed but static HTML yielded content) →
      proceed, flag the result as partial, and explain why in the UI.

**LLM layer (`server/llm.ts`):**
- [ ] Call #1 — brand profile. Groq, JSON mode, low temperature (0.2–0.3). System prompt draft:
      > You extract brand profiles from website content. Use ONLY facts present in the provided
      > content. If information is not present, output exactly "not found" for that field.
      > Never invent facts. Respond with valid JSON matching this schema: ...
- [ ] Call #2 — ad creatives. Input: brand profile + indexed image candidates. Instructions:
      generate 3 ads, tone must match `tone_of_voice`, facts only from the profile, pick an image
      index per ad. Output: JSON array.
- [ ] Validate both responses with zod. Invalid JSON → one retry including the validation error →
      otherwise fail gracefully.
- [ ] **Cost/latency cap (hard requirement):** instrument every pipeline stage — wall time, token
      counts from the API response, estimated cost. Persist to `projects.metrics` and surface in
      the UI ("Generated in 6.2 s · ~1,900 tokens · ~$0.002"). Global pipeline budget: abort with
      a clear message beyond 60 s.

**Wiring:**
- [ ] Server function `createProject(url)`: runs the pipeline, updating status in the DB per stage.
- [ ] Result page `/p/$projectId`: render profile and ads (unstyled is fine at this point).
- [ ] End of day: URL → ads persisted and visible. Commit + deploy + verify in production.

### Day 3 (Thu, ~3 h) — UI, editing, regeneration

- [ ] **`AdCard` component** — Facebook-style preview: primary text on top, image, headline +
      description in muted text, CTA button. Clean and recognizable; pixel-perfection is out of scope.
- [ ] **Brand profile panel** above the ads: what the company does, audience, tone, palette as
      color swatches. Render "not found" fields honestly.
- [ ] **Inline editing:** click a text field → input/textarea → save on blur or via Save →
      server function `updateAd(adId, fields)` writes only the changed fields.
- [ ] **Image swap:** grid/dropdown of the project's `image_candidates` plus a "paste image URL"
      field. (File upload is consciously deferred — §6.)
- [ ] **Regenerate one ad:** per-card button → `regenerateAd(adId)` → the LLM produces one new ad
      (context: profile + the other ads' copy with a "make it distinct" instruction) → UPDATE that
      row only. Manual verification: edit ad #1 → regenerate ad #2 → ad #1 edits are intact.
- [ ] Loading states: skeleton/spinner during `extracting`/`generating`, driven by DB status
      (simple 1–2 s polling; realtime is unnecessary).
- [ ] End of day: full flow works in production. Commit + deploy.

### Friday (by ~17:00) — Testing, README, submission

- [ ] Test against 4–5 unseen sites: a static page, a corporate site, a JS-rendered SPA
      (any Next/React landing page), a broken URL, a non-HTML resource (PDF link).
- [ ] If Snaprime's test URLs have arrived — run those first.
- [ ] Write the final **README.md in English** (structure in §8).
- [ ] Fold `AI_NOTES.md` into the README's AI-agent section.
- [ ] Verify: no secrets in git history, repo accessible, deployment URL opens in an incognito window.
- [ ] Send the email by **17:00–18:00**: deployment URL + repo link + a short cover note.

---

## 5. Hard-Requirements Checklist

- [ ] Works on arbitrary URLs — no per-domain selectors.
- [ ] JS-rendered pages work via a rendering service — or a documented graceful fallback.
- [ ] No hallucinations: "not found" instead of invented facts (verify on a near-empty page).
- [ ] A broken page degrades gracefully with an explanation of why the result is partial.
- [ ] Edit and regenerate-one both persist and never clobber each other.
- [ ] A cost/latency cap is enforced and surfaced (UI or logs).

## 6. Consciously Deferred (defended in the README)

| Item | Why deferred | How I would continue |
|---|---|---|
| Image file upload | Swap-from-candidates + paste-URL covers the use case; upload adds storage + validation (~1–2 h) | Supabase Storage with signed uploads |
| Precise brand-color extraction from CSS/logo | Unreliable within budget; the LLM proposes a palette from content, honestly flagged `llm_suggested` | Screenshot via rendering service + color quantization |
| Extraction caching | Low value at demo scale | KV cache keyed by `hash(url)`, 1 h TTL |
| SSRF protection | Known risk, explicitly named rather than half-solved | Deny-list of private IP ranges, DNS resolution before fetch |
| Image dedup/scoring | Simple heuristics suffice for a single page | Perceptual hashing + dimension filtering |
| Auth / multi-tenancy | Not needed to evaluate the flow | Supabase Auth + RLS |

## 7. Rendering Fallback Plan (if no free tier is viable)

A documented graceful fallback earns partial credit. Implementation: static fetch → if visible
text < 500 chars → UI message: "This page appears to be JavaScript-rendered. Static extraction
returned insufficient content; a headless-rendering service (Browserless / CF Browser Rendering)
would resolve this — not included due to free-tier limits." Surface whatever metadata was
recoverable. The README documents how the service would be wired in (~30 min of work).
**Attempt Browserless first — its free tier is normally sufficient.**

## 8. Final README.md Outline (submission)

1. **What this is** — 2–3 sentences + deployment URL.
2. **How to run** — env vars, `npm i`, `npm run dev`, deploy.
3. **Architecture** — pipeline diagram (ASCII is fine), stack rationale.
4. **Key decisions** — rendering fallback, anti-hallucination approach, cost cap, the
   edit/regenerate design that prevents clobbering.
5. **What I consciously deferred and why** — the table from §6. Their favorite section.
6. **How I used the AI agent** — Claude Code: where it helped (scaffolding, wrangler config,
   zod schemas), the prompts that mattered, and a concrete example of a failure I had to
   correct — specificity here reads as mature and honest.
7. **What I'd do next** — 3–5 items.

## 9. Working Rules

- Commit small and often with meaningful messages — the repo will be read.
- Deploy daily; never batch deployment risk.
- After every Claude Code session, add two lines to `AI_NOTES.md` immediately.
- Stuck on infrastructure for > 40 minutes → simplify or cut (and record it in the README).
- No UI polish before Friday. A working flow beats a pretty one.