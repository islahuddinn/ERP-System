import { AxiosError } from 'axios'

/**
 * Normalize any thrown API/network error into a single human-readable string.
 *
 * NestJS surfaces validation failures as `message: string[]` (one entry per
 * failed field). Passing that array straight to `toast.error` renders a
 * comma-mashed blob; this helper joins them one-per-line so each rule reads
 * clearly. Falls back through `error.message` → the provided fallback.
 */
// Join a NestJS-style message value (string | string[]) into one readable
// string. Returns '' when there's nothing usable so callers can fall through.
function joinMessage(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((m) => String(m).trim())
      .filter(Boolean)
      .join('\n')
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return ''
}

// Generic NestJS envelope strings that carry no real information — skip them so
// we surface the actual validation detail underneath instead.
const GENERIC_MESSAGES = new Set([
  'bad request exception',
  'bad request',
  'internal server error',
  'unprocessable entity',
])

function isGeneric(value: string): boolean {
  return GENERIC_MESSAGES.has(value.trim().toLowerCase())
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as AxiosError<any>)?.response?.data as
    | {
        message?: string | string[]
        error?: string
        // This backend's ValidationExceptionFilter nests the real, per-field
        // validation messages under `validationErrors` / `details.message` and
        // leaves the top-level `message` as the generic "Bad Request Exception".
        // Read those first so the user sees the actual rule (Issue D).
        validationErrors?: string | string[] | { message?: string | string[] }
        details?: { message?: string | string[]; error?: string }
      }
    | undefined

  // 1) Nested validation arrays (most specific) — the real field-level errors.
  const ve = data?.validationErrors
  const veMsg = Array.isArray(ve) || typeof ve === 'string' ? joinMessage(ve) : joinMessage(ve?.message)
  if (veMsg && !isGeneric(veMsg)) return veMsg

  const detailsMsg = joinMessage(data?.details?.message)
  if (detailsMsg && !isGeneric(detailsMsg)) return detailsMsg

  // 2) Top-level message — but only if it's not a generic envelope string.
  const topMsg = joinMessage(data?.message)
  if (topMsg && !isGeneric(topMsg)) return topMsg

  // 3) Error fields, then any non-generic top-level message as a last resort.
  if (typeof data?.error === 'string' && data.error.trim() && !isGeneric(data.error))
    return data.error.trim()
  if (topMsg) return topMsg

  const raw = (error as Error)?.message
  if (isNetworkFailure(error, raw)) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'the API'
    return `Cannot reach the API at ${apiUrl}. Open ${apiUrl.replace(/\/api\/?$/, '')}/api/health in a browser, then set the backend CORS_ORIGIN (or FRONTEND_URL) to this site's origin with no trailing slash.`
  }
  if (typeof raw === 'string' && raw.trim() && raw !== 'Network Error') return raw.trim()

  return fallback
}

function isNetworkFailure(error: unknown, rawMessage?: string): boolean {
  const axiosError = error as AxiosError
  if (axiosError?.code === 'ERR_NETWORK') return true
  if (!axiosError?.response && axiosError?.request) return true
  const message = rawMessage || axiosError?.message || ''
  return /failed to fetch|network error|load failed/i.test(message)
}
