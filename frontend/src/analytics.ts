import { fetchApi } from "./auth"

const SESSION_STORAGE_KEY = "audio42-analytics-session-key"
const VISITOR_STORAGE_KEY = "audio42-analytics-visitor-key"
const LAST_TRACKED_KEY = "audio42-analytics-last-path"
const LAST_TRACKED_AT_KEY = "audio42-analytics-last-at"
const UTM_STORAGE_KEY = "audio42-analytics-utm"

type UtmPayload = {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

function ensureSessionKey() {
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function ensureVisitorKey() {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY)
  if (existing) {
    return existing
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(VISITOR_STORAGE_KEY, next)
  return next
}

function shouldSkipTrack(pathWithQuery: string) {
  const lastPath = window.sessionStorage.getItem(LAST_TRACKED_KEY)
  const lastAt = Number(window.sessionStorage.getItem(LAST_TRACKED_AT_KEY) || "0")

  if (lastPath === pathWithQuery && Date.now() - lastAt < 1500) {
    return true
  }

  window.sessionStorage.setItem(LAST_TRACKED_KEY, pathWithQuery)
  window.sessionStorage.setItem(LAST_TRACKED_AT_KEY, String(Date.now()))
  return false
}

function compactParam(value: string | null) {
  const next = value?.trim()
  return next ? next.slice(0, 255) : null
}

function utmFromSearch(search: string): UtmPayload {
  const params = new URLSearchParams(search)

  return {
    utm_source: compactParam(params.get("utm_source")),
    utm_medium: compactParam(params.get("utm_medium")),
    utm_campaign: compactParam(params.get("utm_campaign")),
    utm_content: compactParam(params.get("utm_content")),
    utm_term: compactParam(params.get("utm_term")),
  }
}

function resolveSessionUtm(search: string): UtmPayload {
  const current = utmFromSearch(search)
  const hasCurrentUtm = Object.values(current).some(Boolean)

  if (hasCurrentUtm) {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(current))
    return current
  }

  const stored = window.sessionStorage.getItem(UTM_STORAGE_KEY)
  if (!stored) {
    return current
  }

  try {
    const parsed = JSON.parse(stored) as Partial<UtmPayload>

    return {
      utm_source: compactParam(parsed.utm_source ?? null),
      utm_medium: compactParam(parsed.utm_medium ?? null),
      utm_campaign: compactParam(parsed.utm_campaign ?? null),
      utm_content: compactParam(parsed.utm_content ?? null),
      utm_term: compactParam(parsed.utm_term ?? null),
    }
  } catch {
    window.sessionStorage.removeItem(UTM_STORAGE_KEY)
    return current
  }
}

export async function trackPublicPageView(pathname: string, search: string) {
  if (typeof window === "undefined") {
    return
  }

  const pathWithQuery = `${pathname}${search || ""}`
  if (shouldSkipTrack(pathWithQuery)) {
    return
  }

  const utm = resolveSessionUtm(search)
  const referrerUrl = document.referrer || ""
  let referrerHost = ""

  if (referrerUrl) {
    try {
      referrerHost = new URL(referrerUrl).host
    } catch {
      referrerHost = ""
    }
  }

  await fetchApi("/api/public/analytics/page-views", {
    method: "POST",
    body: JSON.stringify({
      session_key: ensureSessionKey(),
      visitor_key: ensureVisitorKey(),
      host: window.location.host,
      page_path: pathname,
      page_query: search || null,
      referrer_url: referrerUrl || null,
      referrer_host: referrerHost || null,
      ...utm,
      viewed_at: new Date().toISOString(),
    }),
  })
}
