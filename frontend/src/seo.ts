import { useEffect } from "react"

type SeoConfig = {
  title: string
  description?: string
  path?: string
  imageUrl?: string | null
  type?: "website" | "article"
  noindex?: boolean
}

const SITE_NAME = "Аудиогид42"
const SITE_ORIGIN = "https://audiogid42.ru"
const DEFAULT_DESCRIPTION =
  "Авторские аудиоэкскурсии по Кемерово: маршруты, карта города, пробные треки и покупка доступа на 72 часа."

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isBackofficeHost() {
  if (typeof window === "undefined") {
    return false
  }

  return ["back.audio42.onff.ru", "cabinet.audio42.onff.ru", "back.audiogid42.ru", "cabinet.audiogid42.ru"].includes(
    window.location.hostname,
  )
}

function toAbsoluteUrl(value?: string | null) {
  if (!value) {
    return null
  }

  if (isAbsoluteUrl(value)) {
    return value
  }

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : SITE_ORIGIN
    return new URL(value, origin).toString()
  } catch {
    return null
  }
}

function ensureMeta(name: string, selector: string) {
  if (typeof document === "undefined") {
    return null
  }

  let meta = document.head.querySelector<HTMLMetaElement>(selector)
  if (!meta) {
    meta = document.createElement("meta")
    if (name.startsWith("property:")) {
      meta.setAttribute("property", name.replace("property:", ""))
    } else {
      meta.setAttribute("name", name)
    }
    document.head.appendChild(meta)
  }
  return meta
}

function ensureCanonical() {
  if (typeof document === "undefined") {
    return null
  }

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement("link")
    link.setAttribute("rel", "canonical")
    document.head.appendChild(link)
  }
  return link
}

function normalizeTitle(title: string) {
  if (title.includes(SITE_NAME)) {
    return title
  }

  return `${title} | ${SITE_NAME}`
}

function normalizeDescription(description?: string) {
  const value = (description || DEFAULT_DESCRIPTION).trim()
  return value.length > 200 ? `${value.slice(0, 197).trimEnd()}...` : value
}

export function applySeo(config: SeoConfig) {
  if (typeof document === "undefined") {
    return
  }

  const title = normalizeTitle(config.title)
  const description = normalizeDescription(config.description)
  const canonicalUrl = toAbsoluteUrl(config.path || (typeof window !== "undefined" ? window.location.pathname : "/"))
  const imageUrl = config.imageUrl ? toAbsoluteUrl(config.imageUrl) : null
  const shouldNoindex = config.noindex || isBackofficeHost()

  document.title = title

  const descriptionMeta = ensureMeta("description", 'meta[name="description"]')
  descriptionMeta?.setAttribute("content", description)

  const robotsMeta = ensureMeta("robots", 'meta[name="robots"]')
  robotsMeta?.setAttribute("content", shouldNoindex ? "noindex,nofollow" : "index,follow")

  const ogTitle = ensureMeta("property:og:title", 'meta[property="og:title"]')
  ogTitle?.setAttribute("content", title)

  const ogDescription = ensureMeta("property:og:description", 'meta[property="og:description"]')
  ogDescription?.setAttribute("content", description)

  const ogType = ensureMeta("property:og:type", 'meta[property="og:type"]')
  ogType?.setAttribute("content", config.type || "website")

  const ogUrl = ensureMeta("property:og:url", 'meta[property="og:url"]')
  if (canonicalUrl) {
    ogUrl?.setAttribute("content", canonicalUrl)
  }

  const ogImage = ensureMeta("property:og:image", 'meta[property="og:image"]')
  if (imageUrl) {
    ogImage?.setAttribute("content", imageUrl)
  } else {
    ogImage?.removeAttribute("content")
  }

  const twitterCard = ensureMeta("twitter:card", 'meta[name="twitter:card"]')
  twitterCard?.setAttribute("content", imageUrl ? "summary_large_image" : "summary")

  const canonical = ensureCanonical()
  if (canonicalUrl && canonical) {
    canonical.setAttribute("href", canonicalUrl)
  }
}

export function useSeo(config: SeoConfig) {
  const { title, description, path, imageUrl, type, noindex } = config

  useEffect(() => {
    applySeo({ title, description, path, imageUrl, type, noindex })
  }, [title, description, path, imageUrl, type, noindex])
}
