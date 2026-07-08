// Cost estimate for Groq llama-3.3-70b-versatile (per 1M tokens, as of 2025)
// Input: $0.59 / 1M tokens, Output: $0.79 / 1M tokens
export const GROQ_COST_PER_1M_INPUT = 0.59
export const GROQ_COST_PER_1M_OUTPUT = 0.79

export const GROQ_MODEL = 'llama-3.3-70b-versatile'

// Pipeline budget
export const PIPELINE_TIMEOUT_MS = 60_000
export const FETCH_TIMEOUT_MS = 10_000
export const EMPTY_SHELL_THRESHOLD = 500 // chars of visible text
export const MAX_IMAGE_CANDIDATES = 8
export const MAX_TEXT_CHARS = 10_000

// Browserless
export const BROWSERLESS_CONTENT_URL = 'https://chrome.browserless.io/content'
