# AI_NOTES.md — Agent usage log

## Effective patterns

### Scaffold
- `create-tsrouter-app` is deprecated and creates router-only mode, not TanStack Start.
  Use `npx @tanstack/cli@latest create` with `--deployment cloudflare` flag instead.
- The CLI still shows `Mode: file-router` in the summary but installs `@tanstack/react-start` if
  you don't pass `--router-only`. Confirmed by presence of `tanstackStart()` in `vite.config.ts`.

### LLM prompts
- Groq `response_format: { type: 'json_object' }` requires at least one mention of "JSON" in the
  system prompt, otherwise the API rejects the request.
- Wrapping the ad array in `{ "ads": [...] }` avoids issues with top-level-array JSON mode.
- Low temperature (0.25) on brand profile significantly reduces hallucination tendency.

### Zod + retry
- One retry pattern: send the assistant message + user error message in the same `messages` array.
  This is reliable with Groq and avoids a second full-context call.

## Failures / corrections

| Step | Failure | Fix |
|---|---|---|
| Scaffold | `create-tsrouter-app` → router-only | Used `@tanstack/cli` with `--deployment cloudflare` |
| CLI interactive | `--no-examples` flag not recognised in v0.54 create-tsrouter-app | Switched CLI entirely |

## TODO: fill in as development progresses
