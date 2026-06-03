import { Link, useParams } from "@tanstack/react-router"
import { Fragment, useEffect, useRef, useState } from "react"
import {
  createCheckoutOrder,
  getSelectedTourSlug,
  loadAdBanners,
  loadCheckoutOrderStatus,
  loadCheckoutSuccess,
  loadGuide,
  loadGuides,
  loadMapPoints,
  loadTour,
  loadTourMap,
  loadTours,
  previewCheckout,
  submitTourRating,
  submitContactRequest,
  type AdBanner,
  type ContactRequestPayload,
  type GuideDetail,
  type GuideSummary,
  type PublicMapPoint,
  type TourDetail,
  type TourMapResponse,
  type TourSummary,
} from "./public-api"
import { useI18n } from "./i18n"
import { LEGAL_DOCUMENT_VERSION, MERCHANT, PERSONAL_DATA_CONSENT_PATH } from "./legal-pages"
import { useSeo } from "./seo"
import { YandexMap } from "./yandex-map"

function PageIntro({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead: string
}) {
  return (
    <section className="panel page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lede">{lead}</p>
    </section>
  )
}

function PublicAdBannerSlot({
  banners,
  slotKey,
  className = "",
}: {
  banners: AdBanner[]
  slotKey: AdBanner["slot_key"] | AdBanner["slot_key"][]
  className?: string
}) {
  const slotKeys = Array.isArray(slotKey) ? slotKey : [slotKey]
  const banner = slotKeys.map((key) => banners.find((item) => item.slot_key === key)).find(Boolean)

  if (!banner) {
    return null
  }

  return (
    <aside className={`public-ad-banner ${className}`.trim()}>
      <a href={banner.target_url} target="_blank" rel="noreferrer" aria-label={banner.alt_text || "Рекламный баннер"}>
        <img src={banner.image_url} alt={banner.alt_text || "Рекламный баннер"} />
      </a>
    </aside>
  )
}

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTourPrice(value: number) {
  return Number(value) <= 0 ? "Бесплатно" : formatRub(value)
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "Продолжительность уточняется"
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`
  }

  return `${minutes} мин`
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Ожидает подтверждения"
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatTimeLeft(value: string | null) {
  if (!value) {
    return "Срок доступа уточняется"
  }

  const diff = new Date(value).getTime() - Date.now()

  if (diff <= 0) {
    return "Доступ истёк"
  }

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days} д ${hours} ч`
  }

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`
  }

  return `${minutes} мин`
}

const PUBLIC_PHOTOS_ENABLED = true

function assetUrl(url: string | null | undefined) {
  if (!PUBLIC_PHOTOS_ENABLED) {
    return null
  }

  if (!url) {
    return null
  }

  if (url.includes("/sergey-kolkov.jpg")) {
    return `${url}${url.includes("?") ? "&" : "?"}v=20260327-2328`
  }

  return url
}

const IMAGE_CAPTIONS: Record<string, string> = {
  "/tours/ei-kemerovo/01-monument.jpg": "Ночной Пушкин на бульваре — один из узнаваемых ориентиров маршрута.",
  "/tours/ei-kemerovo/02-arrow.jpg": "Скульптура у набережной и дальний берег Томи в городском кадре.",
  "/tours/ei-kemerovo/03-airship.jpg": "АИК «Кузбасс» над Томью — редкий взгляд на город с воздуха.",
  "/tours/ei-kemerovo/04-river.jpg": "Вечерний центр Кемерово в низком солнце и длинных тенях.",
  "/tours/ei-kemerovo/05-sunset.jpg": "Зимний двор у набережной — живая и игровая сторона города.",
  "/tours/surovaya-rodina/01-panorama.jpg": "Зимняя панорама центра Кемерово в синем вечернем свете.",
  "/tours/surovaya-rodina/02-history.jpg": "Старый план, газетная полоса и ранний индустриальный пейзаж города.",
  "/tours/surovaya-rodina/03-collage.jpg": "Коллаж городской памяти: памятник, графика и зимняя площадь.",
  "/tours/surovaya-rodina/04-money.jpg": "Деньги, медали и документы как материальные следы разных эпох.",
  "/tours/surovaya-rodina/05-monument.jpg": "Яркая скульптура как деталь современной визуальной среды города.",
}

type GalleryItem = {
  image_url: string
  caption: string | null
}

function captionForImage(url: string | null | undefined, directCaption?: string | null) {
  if (directCaption && directCaption.trim()) {
    return directCaption.trim()
  }

  if (!url) {
    return ""
  }

  const normalizedUrl = assetUrl(url) ?? url

  for (const [key, caption] of Object.entries(IMAGE_CAPTIONS)) {
    if (normalizedUrl.includes(key)) {
      return caption
    }
  }

  return ""
}

function buildTourGallery(coverImageUrl: string | null | undefined, galleryImageUrls: string[] | null | undefined) {
  const values = [coverImageUrl, ...(galleryImageUrls ?? [])]
    .map((item) => assetUrl(item))
    .filter((item): item is string => Boolean(item))

  return Array.from(new Set(values))
}

function buildTrackGalleryItems(
  trackGalleryItems: GalleryItem[] | null | undefined,
  trackGalleryImageUrls: string[] | null | undefined,
  fallbackTourGalleryImageUrls: string[] | null | undefined,
) {
  const itemsFromApi = (trackGalleryItems ?? [])
    .map((item) => ({
      image_url: assetUrl(item.image_url),
      caption: captionForImage(item.image_url, item.caption),
    }))
    .filter((item): item is GalleryItem => Boolean(item.image_url))

  const pointGalleryFallbackItems = (trackGalleryImageUrls ?? [])
    .map((item) => assetUrl(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => ({
      image_url: item,
      caption: captionForImage(item),
    }))

  const unique = new Map<string, GalleryItem>()

  for (const item of [...itemsFromApi, ...pointGalleryFallbackItems]) {
    if (!unique.has(item.image_url)) {
      unique.set(item.image_url, item)
    }
  }

  const pointSpecificItems = Array.from(unique.values())
  if (pointSpecificItems.length > 0) {
    return pointSpecificItems.slice(0, 5)
  }

  return (fallbackTourGalleryImageUrls ?? [])
    .map((item) => assetUrl(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => ({
      image_url: item,
      caption: captionForImage(item),
    }))
    .slice(0, 5)
}

function firstTrustPoint(values: string[] | null | undefined) {
  return (values ?? []).find((item) => item && item.trim()) || null
}

function formatOrderStatus(value: string | null | undefined) {
  switch (value) {
    case "paid":
      return "Оплачен"
    case "failed":
      return "Не оплачен"
    case "pending":
      return "Ожидает подтверждения"
    default:
      return value || "Статус уточняется"
  }
}

function AudioSnippet({
  src,
  label,
  audioRef,
}: {
  src: string | null
  label?: string
  audioRef?: (node: HTMLAudioElement | null) => void
}) {
  if (!src) {
    return null
  }

  return (
    <div className="audio-snippet">
      <span className="audio-snippet-label">{label}</span>
      <audio
        ref={audioRef}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        preload="none"
        className="audio-snippet-player"
        onPlay={(event) => {
          document.querySelectorAll("audio").forEach((audio) => {
            if (audio !== event.currentTarget && !audio.paused) {
              audio.pause()
            }
          })
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  )
}

function RatingBadge({ rating }: { rating?: { average: number | null; count: number } }) {
  const { t } = useI18n()
  const average = rating?.average
  const count = rating?.count ?? 0

  return (
    <div className="rating-badge" aria-label={t("rating")}>
      <span className="rating-stars" aria-hidden="true">
        ★★★★★
      </span>
      <strong>{average ? average.toFixed(1) : "—"}</strong>
      <span>{count > 0 ? `${count}` : t("noRatings")}</span>
    </div>
  )
}

function shareUrl(href: string, title: string, imageUrl?: string | null) {
  const params = new URLSearchParams()
  const vkTourUrl = new URL(href)
  vkTourUrl.searchParams.set("share", "vk-image-20260521")
  params.set("url", vkTourUrl.toString())
  params.set("title", title)

  if (imageUrl) {
    params.set("image", imageUrl)
  }

  return `https://vk.com/share.php?${params.toString()}`
}

function TourShareBlock({ tour }: { tour: TourDetail }) {
  const canonicalUrl = typeof window === "undefined" ? `https://audiogid42.ru/excursions/${tour.slug}` : window.location.href.split("#")[0]
  const title = tour.guide.display_name ? `${tour.guide.display_name}: ${tour.title}` : tour.title
  const imageUrl = assetUrl(tour.cover_image_url) || assetUrl(tour.gallery_image_urls[0]) || undefined
  const encodedUrl = encodeURIComponent(canonicalUrl)
  const encodedTitle = encodeURIComponent(title)
  const links = [
    { label: "VK", title: "Сделать пост ВКонтакте", href: shareUrl(canonicalUrl, title, imageUrl) },
    { label: "f", title: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "TG", title: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "WA", title: "WhatsApp", href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${canonicalUrl}`)}` },
    { label: "OK", title: "Одноклассники", href: `https://connect.ok.ru/offer?url=${encodedUrl}&title=${encodedTitle}` },
  ]

  const copyLink = async () => {
    await navigator.clipboard?.writeText(canonicalUrl)
  }

  return (
    <section className="panel tour-share-panel">
      <h3>Благодарим вас за прогулку</h3>
      <p>
        Надеемся, что маршрут оказался интересным и помог увидеть город по-новому.
        Поделитесь им с друзьями — возможно, им тоже будет любопытно.
      </p>
      <div className="tour-share-actions" aria-label="Поделиться">
        {links.map((link) => (
          <a key={link.label} className="tour-share-link" href={link.href} target="_blank" rel="noreferrer" title={link.title}>
            {link.label}
          </a>
        ))}
        <button type="button" className="tour-share-link tour-share-copy" onClick={copyLink} title="Скопировать ссылку">
          ↗
        </button>
      </div>
    </section>
  )
}

function RatingControl({
  slug,
  value,
  onSaved,
}: {
  slug: string
  value: number | null
  onSaved: (rating: { average: number | null; count: number }, userRating: number) => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const submit = async (rating: number) => {
    setBusy(true)
    setMessage("")

    try {
      const payload = await submitTourRating(slug, rating)
      if (!payload) {
        throw new Error("Не удалось сохранить оценку.")
      }
      onSaved(payload.rating, payload.user_rating)
      setMessage(t("ratingSaved"))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rating-control">
      <span>{t("rateTour")}</span>
      <div className="rating-buttons">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={`rating-button ${value && rating <= value ? "rating-button-active" : ""}`}
            disabled={busy}
            onClick={() => void submit(rating)}
            aria-label={`${t("rateTour")}: ${rating}`}
          >
            ★
          </button>
        ))}
      </div>
      {message ? <span className="rating-message">{message}</span> : null}
    </div>
  )
}

export function AboutPage() {
  useSeo({
    title: "Аудиогиды по Кемерово",
    description:
      "Аудиогид42 собирает авторские аудиоэкскурсии по Кемерово: маршруты, карта, пробные треки и доступ к турам на 72 часа.",
    path: "/",
    imageUrl: "/daytrip-route.jpg",
  })

  return (
    <div className="page public-page">
      <section className="hero-grid">
        <div className="hero-copy panel panel-glow">
          <p className="eyebrow">О проекте</p>
          <h1>Говорит Кемерово: люди, события, легенды</h1>
          <div className="hero-about-text">
            <p>
              Официальная история Кемерово отсчитывается с 1918 года. Но город начался гораздо раньше — более 350 лет назад,
              во времена освоения Сибири. С Верхотомского острога, поставленного на Томи в 1665 году, и первых деревень рядом
              с ним: Щеглова и Комарова.
            </p>
            <p>
              Позже сюда придёт Большой угольный век. Сначала — Копикуз, затем международная индустриальная колония АИК
              «Кузбасс», шахты, заводы и стратегический интерес государства к добыче чёрного золота.
            </p>
            <p>
              Так постепенно сложился характер Кемерово: сибирский, упрямый, немного суровый и привыкший жить между рекой,
              углём и большой историей.
            </p>
            <p>
              Наши аудиогиды рассказывают о городе от самых первых поселений до наших дней.
            </p>
            <p>
              Маршруты доступны на русском, английском, немецком и китайском языках.
            </p>
            <p>
              Оплата всеми типами карт, включая UnionPay и выпущенные зарубежными банками Visa, Mastercard.
            </p>
            <div className="payment-system-icons" aria-label="Поддерживаемые платёжные системы">
              <span className="payment-system-icon payment-system-icon-mir">
                <img src="/payment-systems/mir.svg?v=20260601" alt="Мир" loading="lazy" />
              </span>
              <span className="payment-system-icon payment-system-icon-unionpay">
                <img src="/payment-systems/unionpay.png?v=20260601" alt="UnionPay" loading="lazy" />
              </span>
              <span className="payment-system-icon payment-system-icon-visa">
                <img src="/payment-systems/visa.svg?v=20260601" alt="Visa" loading="lazy" />
              </span>
              <span className="payment-system-icon payment-system-icon-mastercard">
                <img src="/payment-systems/mastercard.svg?v=20260601" alt="Mastercard" loading="lazy" />
              </span>
            </div>
          </div>
          <div className="cta-row">
            <Link to="/excursions" className="button button-primary">
              Смотреть экскурсии
            </Link>
            <Link to="/map" className="button button-secondary">
              Открыть карту
            </Link>
          </div>
        </div>

        <div className="hero-card-stack">
          <article className="panel metric-card">
            <span className="metric-label">Полный доступ</span>
            <strong className="metric-value">72 часа</strong>
            <span className="metric-note">
              После оплаты экскурсия открывается без ограничения числа прослушиваний.
            </span>
          </article>
          <article className="panel metric-card">
            <span className="metric-label">Карта</span>
            <strong className="metric-value">Маршрут</strong>
            <span className="metric-note">
              Точки интереса, линии маршрута и текущее местоположение на прогулке.
            </span>
          </article>
          <article className="panel route-preview">
            <span className="route-pill">Слушайте так, как вам удобно</span>
            <h2>Рекомендуем порядок, но не ограничиваем слушателя</h2>
            <p>
              Маршрут задаётся автором, но пользователь может начать его с любой точки города и запускать нужный трек в удобной последовательности.
            </p>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel tour-card">
          <p className="eyebrow">Кабинет</p>
          <h3>Личный кабинет</h3>
          <p>
            В личном кабинете сохраняются покупки, активные экскурсии и срок доступа к ним.
          </p>
        </article>
      </section>
    </div>
  )
}

export function ExcursionsPage() {
  const { t, locale } = useI18n()
  const [tours, setTours] = useState<TourSummary[]>([])
  const [adBanners, setAdBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSeo({
    title: t("catalogTitle"),
    description: t("catalogLead"),
    path: "/excursions",
    imageUrl: "/daytrip-route.jpg",
  })

  useEffect(() => {
    void loadTours()
      .then(setTours)
      .catch((nextError) => {
            setError(nextError instanceof Error ? nextError.message : t("catalogError"))
      })
      .finally(() => setLoading(false))
  }, [locale, t])

  useEffect(() => {
    void loadAdBanners("excursions").then(setAdBanners).catch(() => setAdBanners([]))
  }, [])

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="Маршруты"
        title={t("catalogTitle")}
        lead={t("catalogLead")}
      />

      {loading ? <section className="panel empty-state">{t("catalogLoading")}</section> : null}
      {error ? <section className="panel empty-state error-state">{error}</section> : null}

      {!loading && !error ? (
        <PublicAdBannerSlot banners={adBanners} slotKey="block_start" />
      ) : null}

      {!loading && !error ? (
        <section className="catalog-grid">
          {tours.map((tour, index) => (
            <Fragment key={tour.id}>
            <article className="panel catalog-card">
              {assetUrl(tour.cover_image_url) ? (
                <div
                  className="catalog-cover"
                  style={{ backgroundImage: `url(${assetUrl(tour.cover_image_url)})` }}
                />
              ) : null}
              <div className="catalog-body">
                <p className="eyebrow">{t("route")}</p>
                <h3>{tour.title}</h3>
                <p>{tour.short_description || "Описание маршрута появится после публикации экскурсии."}</p>
                <RatingBadge rating={tour.rating} />
                <dl className="tour-meta">
                  <div>
                    <dt>{t("guide")}</dt>
                    <dd>{tour.guide.display_name || t("guide")}</dd>
                  </div>
                  <div>
                    <dt>{t("duration")}</dt>
                    <dd>{formatDuration(tour.duration_minutes)}</dd>
                  </div>
                  <div>
                    <dt>{t("price")}</dt>
                    <dd>{formatTourPrice(tour.price_rub)}</dd>
                  </div>
                </dl>

                <div className="demo-strip">
                  <strong>{t("listenAuthor")}</strong>
                  <span>{tour.guide.about_audio_file_name ? "О себе" : t("demoSoon")}</span>
                  <AudioSnippet src={tour.guide.about_audio_url || null} />
                </div>

                <div className="cta-row">
                  <Link
                    to="/excursions/$slug"
                    params={{ slug: tour.slug }}
                    className="button button-secondary"
                  >
                    {t("openTour")}
                  </Link>
                  {Number(tour.price_rub) <= 0 ? (
                    <span className="button button-primary catalog-free-status" aria-disabled="true">
                      Бесплатно
                    </span>
                  ) : (
                    <a href={`/terms?tour=${tour.slug}`} className="button button-primary">
                      {t("buyAccess")}
                    </a>
                  )}
                </div>
              </div>
            </article>
            {index + 1 === Math.max(1, Math.ceil(tours.length / 2)) ? (
              <PublicAdBannerSlot banners={adBanners} slotKey={["block_middle", "after_second_card"]} className="catalog-ad-banner" />
            ) : null}
            </Fragment>
          ))}
        </section>
      ) : null}

      {!loading && !error ? (
        <PublicAdBannerSlot banners={adBanners} slotKey={["block_end", "after_intro"]} />
      ) : null}
    </div>
  )
}

export function TourPage() {
  const { slug } = useParams({ from: "/excursions/$slug" })
  const { t, locale } = useI18n()
  const [tour, setTour] = useState<TourDetail | null>(null)
  const [tourMap, setTourMap] = useState<TourMapResponse | null>(null)
  const [relatedTours, setRelatedTours] = useState<TourSummary[]>([])
  const [adBanners, setAdBanners] = useState<AdBanner[]>([])
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const [lightboxItems, setLightboxItems] = useState<GalleryItem[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null)
  const [activePointId, setActivePointId] = useState<number | null>(null)
  const [mapActionMessage, setMapActionMessage] = useState("")
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const trackRefs = useRef<Record<number, HTMLLIElement | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSeo({
    title: tour?.title ? `${tour.title} — ${t("tourPage")}` : t("tourPage"),
    description:
      tour?.full_description ||
      tour?.short_description ||
      "Авторская аудиоэкскурсия по Кемерово с картой, точками маршрута и пробными треками.",
    path: `/excursions/${slug}`,
    imageUrl: tour?.cover_image_url || tour?.gallery_image_urls?.[0] || "/daytrip-route.jpg",
    type: "article",
  })

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError("")
    setTour(null)
    setTourMap(null)
    setRelatedTours([])

    void (async () => {
      try {
        const nextTour = await loadTour(slug)

        if (cancelled) {
          return
        }

        if (!nextTour) {
          throw new Error("Тур не найден.")
        }

        const [nextMap, allTours] = await Promise.all([
          loadTourMap(slug).catch(() => null),
          loadTours().catch(() => []),
        ])

        if (cancelled) {
          return
        }

        setTour(nextTour)
        setTourMap(nextMap)
        setRelatedTours(
          allTours.filter(
            (candidate) =>
              candidate.slug !== slug &&
              candidate.guide.id !== null &&
              candidate.guide.id === nextTour?.guide.id,
            ),
        )
      } catch (nextError) {
        if (cancelled) {
          return
        }

        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить тур.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug, locale])

  useEffect(() => {
    setActiveGalleryIndex(0)
  }, [tour?.slug])

  useEffect(() => {
    setLightboxItems([])
    setLightboxIndex(0)
  }, [tour?.slug])

  useEffect(() => {
    void loadAdBanners("tour").then(setAdBanners).catch(() => setAdBanners([]))
  }, [])

  if (loading) {
    return (
      <div className="page section-page">
        <section className="panel empty-state">Загружаем тур...</section>
      </div>
    )
  }

  if (error || !tour) {
    return (
      <div className="page section-page">
        <section className="panel empty-state error-state">{error || "Тур не найден."}</section>
      </div>
    )
  }

  const mapPoints =
    tourMap?.points.map((point) => ({
      pointId: point.id,
      lat: point.lat,
      lng: point.lng,
      title: point.title || "Точка маршрута",
      balloonHtml: `<div><strong>${point.title || "Точка маршрута"}</strong><br/>Маршрут: ${tour.title}<br/>Нажмите на точку, чтобы открыть связанный трек.</div>`,
    })) ?? []
  const isFreeTour = Number(tour.price_rub) <= 0
  const hasAccess = isFreeTour || (tour.viewer_access?.is_active ?? false)
  const galleryImages = buildTourGallery(tour.cover_image_url, tour.gallery_image_urls)
  const heroGalleryItems = galleryImages.map((imageUrl) => ({
    image_url: imageUrl,
    caption: captionForImage(imageUrl),
  }))
  const activeGalleryImage = galleryImages[activeGalleryIndex] ?? galleryImages[0] ?? null
  const handleMapPointClick = (pointId?: number) => {
    if (!pointId) {
      return
    }

    const track = tour.tracks.find((item) => item.tour_point_id === pointId)

    if (!track) {
      setActivePointId(pointId)
      setMapActionMessage("Для этой точки аудиотрек ещё не добавлен.")
      return
    }

    setActiveTrackId(track.id)
    setActivePointId(pointId)
    setMapActionMessage("")

    trackRefs.current[track.id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })

    if (!track.is_accessible) {
      setMapActionMessage(`Точка найдена: «${track.title}». Этот трек станет доступен после покупки экскурсии.`)
      return
    }

    setMapActionMessage(`Трек открыт: «${track.title}». Нажмите play в карточке трека.`)
  }
  const showTrackOnMap = (pointId?: number | null) => {
    if (!pointId) {
      return
    }

    setActivePointId(pointId)
    setMapActionMessage("Точка показана на карте.")
    document.querySelector(".route-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
  const openLightbox = (images: GalleryItem[], startIndex = 0) => {
    if (!images.length) {
      return
    }
    setLightboxItems(images)
    setLightboxIndex(startIndex)
  }
  const closeLightbox = () => {
    setLightboxItems([])
    setLightboxIndex(0)
  }
  const showPrevLightbox = () => {
    setLightboxIndex((current) => {
      if (lightboxItems.length === 0) {
        return current
      }
      return current === 0 ? lightboxItems.length - 1 : current - 1
    })
  }
  const showNextLightbox = () => {
    setLightboxIndex((current) => {
      if (lightboxItems.length === 0) {
        return current
      }
      return current === lightboxItems.length - 1 ? 0 : current + 1
    })
  }
  const mainTracks = tour.tracks.filter((track) => (track.track_type || "main") !== "bonus")
  const bonusTracks = tour.tracks.filter((track) => track.track_type === "bonus")
  const renderTrack = (track: TourDetail["tracks"][number]) => (
    <li
      key={track.id}
      ref={(node) => {
        trackRefs.current[track.id] = node
      }}
      className={`track-item ${track.track_type === "bonus" ? "track-item-bonus" : ""} ${track.is_demo ? "track-item-demo" : ""} ${track.is_accessible ? "track-item-open" : "track-item-locked"} ${activeTrackId === track.id ? "track-item-active" : ""}`}
    >
      <div>
        <strong>
          {track.sort_order}. {track.title}
        </strong>
        {track.description ? <p>{track.description}</p> : null}
        <AudioSnippet
          src={track.is_accessible ? track.audio_url : null}
          label={track.is_demo ? "Открытое прослушивание" : track.track_type === "bonus" ? "Бонусный трек" : undefined}
          audioRef={(node) => {
            audioRefs.current[track.id] = node
          }}
        />
        {buildTrackGalleryItems(track.gallery_items, track.gallery_image_urls, tour.gallery_image_urls).length > 0 ? (
          <div className="track-photo-strip">
            {buildTrackGalleryItems(track.gallery_items, track.gallery_image_urls, tour.gallery_image_urls).map((item, index) => (
              <figure key={`${track.id}-${item.image_url}-${index}`} className="track-photo-card">
                <button
                  type="button"
                  className="track-photo-thumb"
                  onClick={() => openLightbox(buildTrackGalleryItems(track.gallery_items, track.gallery_image_urls, tour.gallery_image_urls), index)}
                >
                  <img src={item.image_url} alt={`${track.title} — фото ${index + 1}`} />
                </button>
                {captionForImage(item.image_url, item.caption) ? (
                  <figcaption className="track-photo-caption">{captionForImage(item.image_url, item.caption)}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
      <span className="track-badge-group">
        <span className={`track-badge ${track.track_type === "bonus" ? "track-badge-bonus" : ""} ${track.is_accessible ? "track-badge-open" : ""}`}>
          {track.track_type === "bonus" ? "Бонус" : track.is_demo ? "Бесплатно" : track.is_accessible ? "Доступ открыт" : "трекам прогулки"}
        </span>
        {track.is_accessible && track.tour_point_id && (track.track_type || "main") !== "bonus" ? (
          <button
            type="button"
            className="track-map-jump"
            onClick={() => showTrackOnMap(track.tour_point_id)}
            aria-label="Показать точку на карте"
            title="Карта тура"
          >
            Я
          </button>
        ) : null}
      </span>
    </li>
  )

  return (
    <div className="page section-page">
      {hasAccess ? (
        <section className="panel access-banner">
          <p className="eyebrow">Приглашаем прослушать</p>
          <h3>{tour.title}</h3>
          <p>
            Доступ активен до {formatDateTime(tour.viewer_access?.expires_at ?? null)}.
            <br />
            Осталось: {formatTimeLeft(tour.viewer_access?.expires_at ?? null)}.
          </p>
        </section>
      ) : null}

      <section className="tour-hero panel">
        {assetUrl(tour.cover_image_url) ? (
          <div
            className="tour-hero-cover"
            style={{ backgroundImage: `url(${assetUrl(tour.cover_image_url)})` }}
          />
        ) : null}
        <div className="tour-hero-body">
          <h1>{tour.title}</h1>
          <p className="lede">{tour.full_description || tour.short_description || "Подробное описание маршрута будет добавлено."}</p>
          <div className="rating-panel">
            <RatingBadge rating={tour.rating} />
            <RatingControl
              slug={tour.slug}
              value={tour.user_rating}
              onSaved={(rating, userRating) =>
                setTour((current) => current ? { ...current, rating, user_rating: userRating } : current)
              }
            />
          </div>

          <dl className="tour-meta">
            <div>
              <dt>{t("guide")}</dt>
              <dd>
                {tour.guide.slug && tour.guide.display_name ? (
                  <a href={`/guides/${tour.guide.slug}`}>{tour.guide.display_name}</a>
                ) : (
                  tour.guide.display_name || t("guide")
                )}
              </dd>
            </div>
            <div>
              <dt>{t("forWhom")}</dt>
              <dd>{tour.audience_description || "Для самостоятельной прогулки по Кемерово."}</dd>
            </div>
            <div>
              <dt>{t("duration")}</dt>
              <dd>{formatDuration(tour.duration_minutes)}</dd>
            </div>
            <div>
              <dt>{t("price")}</dt>
              <dd>{formatTourPrice(tour.price_rub)}</dd>
            </div>
          </dl>

          {!hasAccess && Number(tour.price_rub) > 0 ? (
            <div className="cta-row">
              <a href={`/terms?tour=${tour.slug}`} className="button button-primary">
                {t("buyAccess")}
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <PublicAdBannerSlot banners={adBanners} slotKey="block_start" />

      <section className="tour-grid">
        <article className="panel track-panel">
          <p className="eyebrow">{t("routeTracks")}</p>
          <h3>{hasAccess ? "Все треки открыты для прослушивания" : t("freeTracks")}</h3>
          <ul className="track-list">
            {mainTracks.flatMap((track, index) =>
              !track.tour_point_id && (index === 0 || mainTracks[index - 1].tour_point_id)
                ? [
                    <li key="bonus-track-subhead" className="bonus-track-subhead">
                      Бонус-треки
                    </li>,
                    renderTrack(track),
                  ]
                : [renderTrack(track)],
            )}
          </ul>
          {bonusTracks.length > 0 ? (
            <div className="bonus-track-section">
              <div className="bonus-track-head">
                <p className="eyebrow">{t("bonusTracks")}</p>
                <h4>{t("bonusTracksLead")}</h4>
              </div>
              <ul className="track-list bonus-track-list">
                {bonusTracks.map(renderTrack)}
              </ul>
            </div>
          ) : null}
        </article>

        <article className="panel route-panel">
          <p className="eyebrow">Карта тура</p>
          <h3>Точки маршрута на карте</h3>
          <YandexMap
            points={mapPoints}
            selectedPointId={activePointId}
            polyline={tourMap?.polyline}
            className="tour-map-surface"
            onPointClick={(point) => handleMapPointClick(point.pointId)}
          />
          <button
            type="button"
            className="mini-button map-show-all-points"
            onClick={() => {
              setActivePointId(null)
              setMapActionMessage("Показаны все точки маршрута.")
            }}
          >
            Показать все точки маршрута
          </button>
          <p className="map-action-note">
            Нажмите на точку на карте, чтобы открыть связанный трек маршрута.
          </p>
          {mapActionMessage ? <p className="map-action-status">{mapActionMessage}</p> : null}
          <ul className="route-list">
            {tour.points.map((point) => (
              <li key={point.id} className={`route-point-item ${activePointId === point.id ? "route-point-item-active" : ""}`}>
                <div className="route-point-head">
                  <strong>
                    {point.title || "Точка маршрута"}
                  </strong>
                  <button type="button" className="route-point-action" onClick={() => handleMapPointClick(point.id)}>
                    Открыть трек
                  </button>
                </div>
                {point.description ? <p>{point.description}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <PublicAdBannerSlot banners={adBanners} slotKey={["block_middle", "after_route"]} />

      {lightboxItems.length > 0 ? (
        <div className="lightbox-backdrop" role="dialog" aria-modal="true" onClick={closeLightbox}>
          <div className="lightbox-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="lightbox-close" onClick={closeLightbox}>
              Закрыть
            </button>
            <button type="button" className="lightbox-nav lightbox-nav-prev" onClick={showPrevLightbox}>
              Назад
            </button>
            <img
              src={lightboxItems[lightboxIndex]?.image_url}
              alt={`${tour.title} — фото ${lightboxIndex + 1}`}
              className="lightbox-image"
            />
            {captionForImage(lightboxItems[lightboxIndex]?.image_url, lightboxItems[lightboxIndex]?.caption) ? (
              <p className="lightbox-caption">{captionForImage(lightboxItems[lightboxIndex]?.image_url, lightboxItems[lightboxIndex]?.caption)}</p>
            ) : null}
            <button type="button" className="lightbox-nav lightbox-nav-next" onClick={showNextLightbox}>
              Вперёд
            </button>
            <div className="lightbox-counter">
              {lightboxIndex + 1} / {lightboxItems.length}
            </div>
          </div>
        </div>
      ) : null}

      <section className="content-grid">
        <article className="panel tour-card">
          <p className="eyebrow">Рассказчик</p>
          <div className="author-identity">
            {assetUrl(tour.guide.photo_url) ? (
              <img
                src={assetUrl(tour.guide.photo_url) || undefined}
                alt={tour.guide.display_name || "Экскурсовод"}
                className="guide-avatar guide-avatar-photo"
              />
            ) : null}
            <div>
              <h3>{tour.guide.display_name || "Автор маршрута"}</h3>
              {tour.guide.headline ? <p className="guide-headline">{tour.guide.headline}</p> : null}
              <p>{tour.guide.bio || "Описание экскурсовода будет размещено на персональной странице."}</p>
              {firstTrustPoint(tour.guide.trust_points) ? (
                <div className="guide-trust-inline">
                  <strong>Почему стоит слушать</strong>
                  <span>{firstTrustPoint(tour.guide.trust_points)}</span>
                </div>
              ) : null}
              <AudioSnippet src={tour.guide.about_audio_url} label="Прослушать голос автора" />
            </div>
          </div>
          <div className="cta-row">
            {tour.guide.slug ? (
              <a href={`/guides/${tour.guide.slug}`} className="button button-primary tour-author-about-button">
                Об авторе
              </a>
            ) : null}
            {tour.guide.website_url ? (
              <a href={tour.guide.website_url} className="button button-secondary" target="_blank" rel="noreferrer">
                Сайт автора
              </a>
            ) : null}
            {tour.guide.social_links.slice(0, 1).map((item, index) => {
              const label =
                typeof item === "string"
                  ? "Соцсеть"
                  : typeof item === "object" && item
                    ? (item as { label?: string }).label || "Соцсеть"
                    : "Соцсеть"
              const url =
                typeof item === "string"
                  ? item
                  : typeof item === "object" && item
                    ? (item as { url?: string }).url || ""
                    : ""

              if (!url) {
                return null
              }

              return (
                <a key={`${label}-${index}`} href={url} className="button button-secondary" target="_blank" rel="noreferrer">
                  {label}
                </a>
              )
            })}
          </div>
        </article>

        <article className="panel tour-card">
          <p className="eyebrow">После оплаты</p>
          <h3>Все треки активируются на 72 часа</h3>
          <p>
            Клиент получает сообщение «Спасибо! Слушайте», доступ ко всем трекам тура и
            запись о покупке в личном кабинете.
          </p>
        </article>

        <article className="panel tour-card">
          <p className="eyebrow">Порядок прослушивания</p>
          <h3>Можно идти по своему сценарию</h3>
          <p>
            Маршрут создан в рекомендованной последовательности, но слушатель может выбрать
            произвольно, к какой точке перейти дальше.
          </p>
        </article>
      </section>

      {relatedTours.length > 0 ? (
        <section className="prototype-section">
          <div className="section-head">
            <p className="eyebrow">Другие туры этого экскурсовода</p>
            <h2>Рекомендации по автору</h2>
          </div>

          <div className="prototype-grid">
            {relatedTours.map((candidate) => (
              <article key={candidate.id} className="panel prototype-card">
                <span className="prototype-author">{candidate.guide.display_name || "Экскурсовод"}</span>
                <h3>{candidate.title}</h3>
                <p>{candidate.short_description || "Авторский маршрут по городу Кемерово."}</p>
                <Link
                  to="/excursions/$slug"
                  params={{ slug: candidate.slug }}
                  className="button button-secondary"
                >
                  Перейти к туру
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <PublicAdBannerSlot banners={adBanners} slotKey="block_end" />
    </div>
  )
}

export function GuidesPage() {
  const [guides, setGuides] = useState<GuideSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSeo({
    title: "Экскурсоводы по Кемерово",
    description:
      "Познакомьтесь с авторами городских прогулок, откройте их страницы и выберите экскурсию по Кемерово.",
    path: "/guides",
    imageUrl: "/sergey-kolkov.jpg",
  })

  useEffect(() => {
    void loadGuides()
      .then(setGuides)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить экскурсоводов.")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="Экскурсоводы"
        title="Экскурсоводы и их маршруты"
        lead="Познакомьтесь с авторами городских прогулок, откройте их персональные страницы и выберите экскурсию по настроению."
      />

      {loading ? <section className="panel empty-state">Загружаем экскурсоводов...</section> : null}
      {error ? <section className="panel empty-state error-state">{error}</section> : null}

      {!loading && !error ? (
        <section className="guide-grid">
          {guides.map((guide) => (
            <article key={guide.slug} className="panel guide-card">
              <Link to="/guides/$slug" params={{ slug: guide.slug }} className="guide-photo-link">
                {assetUrl(guide.photo_url) ? (
                  <img
                    src={assetUrl(guide.photo_url) || undefined}
                    alt={guide.display_name}
                    className="guide-avatar guide-avatar-photo guide-card-photo"
                  />
                ) : (
                  <div className="guide-avatar guide-card-photo">{guide.display_name.slice(0, 1)}</div>
                )}
              </Link>
              <h3>{guide.display_name}</h3>
              {guide.headline ? <p className="guide-headline">{guide.headline}</p> : null}
              <p>{guide.bio || "Авторские туры по Кемерово и своя карта точек интереса."}</p>
              {firstTrustPoint(guide.trust_points) ? (
                <div className="guide-trust-inline">
                  <strong>Почему стоит слушать</strong>
                  <span>{firstTrustPoint(guide.trust_points)}</span>
                </div>
              ) : null}
              <AudioSnippet src={guide.about_audio_url} label="Прослушать голос автора" />
              <div className="guide-tour-list">
                {guide.tours.map((tour) => (
                  <Link
                    key={tour.id}
                    to="/excursions/$slug"
                    params={{ slug: tour.slug }}
                    className="guide-tour-pill"
                  >
                    {tour.title}
                  </Link>
                ))}
              </div>
              <div className="cta-row">
                <Link
                  to="/guides/$slug"
                  params={{ slug: guide.slug }}
                  className="button button-secondary"
                >
                  Профиль экскурсовода
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}

export function GuidePage() {
  const { slug } = useParams({ from: "/guides/$slug" })
  const [guide, setGuide] = useState<GuideDetail | null>(null)
  const [adBanners, setAdBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSeo({
    title: guide?.display_name ? `${guide.display_name} — экскурсовод по Кемерово` : "Экскурсовод по Кемерово",
    description:
      guide?.bio || "Авторские маршруты, городские истории и экскурсии по Кемерово.",
    path: `/guides/${slug}`,
    imageUrl: guide?.photo_url || "/sergey-kolkov.jpg",
    type: "article",
  })

  useEffect(() => {
    let cancelled = false

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setError("Не удалось загрузить страницу экскурсовода. Обновите страницу или откройте список экскурсоводов.")
        setLoading(false)
      }
    }, 10000)

    async function loadGuidePage() {
      setLoading(true)
      setError("")

      try {
        const nextGuide = await loadGuide(slug)

        if (!nextGuide) {
          throw new Error("Экскурсовод не найден или профиль пока не опубликован.")
        }

        if (!cancelled) {
          setGuide(nextGuide)
        }
      } catch (nextError) {
        if (!cancelled) {
          setGuide(null)
          setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить страницу экскурсовода.")
        }
      } finally {
        window.clearTimeout(timeoutId)

        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadGuidePage()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [slug])

  useEffect(() => {
    void loadAdBanners("guide").then(setAdBanners).catch(() => setAdBanners([]))
  }, [])

  if (loading) {
    return (
      <div className="page section-page">
        <section className="panel empty-state">Загружаем страницу экскурсовода...</section>
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className="page section-page">
        <section className="panel empty-state error-state">{error || "Экскурсовод не найден."}</section>
      </div>
    )
  }

  return (
    <div className="page section-page">
      {guide.viewer_accesses.length > 0 ? (
        <section className="access-banner-grid">
          {guide.viewer_accesses.map((access) => (
            <article key={access.tour_id} className="panel access-banner">
              <p className="eyebrow">Купленная экскурсия</p>
              <h3>{access.tour_title || "Доступный тур"}</h3>
              <p>
                Доступ активен до {formatDateTime(access.expires_at)}. Осталось: {formatTimeLeft(access.expires_at)}.
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="tour-hero panel">
        <div className="tour-hero-body">
          <div className="author-identity">
            {assetUrl(guide.photo_url) ? (
              <img
                src={assetUrl(guide.photo_url) || undefined}
                alt={guide.display_name}
                className="guide-avatar guide-avatar-photo guide-hero-avatar"
              />
            ) : null}
            <div>
              <p className="eyebrow">Познакомимся</p>
              <h1>{guide.display_name}</h1>
              {guide.headline ? <p className="guide-headline guide-headline-hero">{guide.headline}</p> : null}
              <p className="lede">
                {guide.bio || "Подробное описание экскурсовода будет размещено здесь."}
              </p>
              <AudioSnippet src={guide.about_audio_url} label="Прослушать голос автора" />
            </div>
          </div>

          <div className="cta-row">
            {guide.website_url ? (
              <a href={guide.website_url} className="button button-secondary" target="_blank" rel="noreferrer">
                Сайт экскурсовода
              </a>
            ) : null}
            {guide.social_links.slice(0, 3).map((item, index) => {
              const label =
                typeof item === "string"
                  ? item
                  : typeof item === "object" && item
                    ? (item as { label?: string }).label || `Соцсеть ${index + 1}`
                    : `Соцсеть ${index + 1}`
              const url =
                typeof item === "string"
                  ? item
                  : typeof item === "object" && item
                    ? (item as { url?: string }).url || ""
                    : ""

              if (!url) {
                return null
              }

              return (
                <a key={`${label}-${index}`} href={url} className="button button-secondary" target="_blank" rel="noreferrer">
                  {label}
                </a>
              )
            })}
            <Link to="/excursions" className="button button-primary">
              Все прогулки
            </Link>
          </div>
        </div>
      </section>

      <PublicAdBannerSlot banners={adBanners} slotKey="block_start" />

      {guide.trust_points.length > 0 ? (
        <section className="panel guide-trust-panel">
          <p className="eyebrow">Почему стоит слушать автора</p>
          <h3>Авторский опыт и опорные факты</h3>
          <ul className="clean-list trust-points-list">
            {guide.trust_points.map((item, index) => (
              <li key={`${guide.slug}-trust-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <PublicAdBannerSlot banners={adBanners} slotKey="block_middle" />

      <section className="catalog-grid">
        {guide.tours.map((tour) => (
          <article key={tour.id} className="panel catalog-card">
            {assetUrl(tour.cover_image_url) ? (
              <div
                className="catalog-cover"
                style={{ backgroundImage: `url(${assetUrl(tour.cover_image_url)})` }}
              />
            ) : null}
            <div className="catalog-body">
              <p className="eyebrow">Маршрут прогулки</p>
              <h3>{tour.title}</h3>
              <p>{tour.short_description || "Описание маршрута будет добавлено."}</p>
              {tour.viewer_access?.is_active ? (
                <div className="demo-strip">
                  <strong>Доступ уже куплен</strong>
                  <span>Активен до {formatDateTime(tour.viewer_access.expires_at)}.</span>
                </div>
              ) : null}
              <dl className="tour-meta">
                <div>
                  <dt>Продолжительность</dt>
                  <dd>{formatDuration(tour.duration_minutes)}</dd>
                </div>
                <div>
                  <dt>Стоимость</dt>
                  <dd>{formatTourPrice(tour.price_rub)}</dd>
                </div>
              </dl>
              <div className="cta-row">
                <Link
                  to="/excursions/$slug"
                  params={{ slug: tour.slug }}
                  className="button button-primary"
                >
                  Открыть
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <PublicAdBannerSlot banners={adBanners} slotKey={["block_end", "after_hero"]} />

    </div>
  )
}

export function MapPage() {
  const [points, setPoints] = useState<PublicMapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useSeo({
    title: "Карта экскурсий по Кемерово",
    description:
      "Откройте точки интереса на карте Кемерово и посмотрите, в каких экскурсиях они встречаются.",
    path: "/map",
    imageUrl: "/daytrip-route.jpg",
  })

  useEffect(() => {
    void loadMapPoints()
      .then(setPoints)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить карту.")
      })
      .finally(() => setLoading(false))
  }, [])

  const mapPoints = points.map((point) => ({
    lat: point.lat,
    lng: point.lng,
    title: point.title,
    balloonHtml: point.tours.length > 0 ? point.tours
      .map(
        (tour) =>
          `<div><a href="/excursions/${tour.slug}">${tour.title}</a><br/>${tour.guide_name ?? "Экскурсовод"}</div>`,
      )
      .join("<hr/>") : "<div>Точка добавлена в справочник. В турах пока не используется.</div>",
  }))

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="Карта"
        title="Точки интереса и туры на карте города"
        lead="На общей карте точка показывает, в каких турах она отмечена. Нажатие ведёт в карточку конкретного тура, а встроенная геолокация помогает понять, где вы сейчас."
      />

      {loading ? <section className="panel empty-state">Загружаем карту...</section> : null}
      {error ? <section className="panel empty-state error-state">{error}</section> : null}

      {!loading && !error ? (
        <>
          <section className="map-layout">
            <article className="panel map-card">
              <h3>Что уже работает на платформе</h3>
              <ul className="clean-list">
                <li>Точки интереса выводятся на интерактивную карту</li>
                <li>Одна точка может принадлежать нескольким турам</li>
                <li>Из пузыря точки можно перейти в карточку тура</li>
                <li>Карта включает геолокацию пользователя</li>
              </ul>
            </article>

            <YandexMap
              points={mapPoints}
              className="map-page-surface"
              emptyMessage="Точки ещё не опубликованы экскурсоводами."
            />
          </section>

          <section className="point-list">
            {points.map((point) => (
              <article key={point.point_id} className="panel point-card">
                <h3>{point.title}</h3>
                <p>{point.tours.length > 0 ? "В этой точке доступны следующие туры:" : "Точка добавлена в справочник. В турах пока не используется."}</p>
                <ul className="clean-list">
                  {point.tours.map((tour) => (
                    <li key={`${point.point_id}-${tour.id}`}>
                      <a href={`/excursions/${tour.slug}`}>{tour.title}</a>, {tour.guide_name || "Экскурсовод"}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  )
}

export function TermsPage() {
  const [tours, setTours] = useState<TourSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [acceptOffer, setAcceptOffer] = useState(false)
  const [acceptPdn, setAcceptPdn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCheckout>> | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState("")
  const selectedSlug = getSelectedTourSlug()

  useSeo({
    title: "Оплата и доступ",
    description:
      "Выберите экскурсию, примените промокод при необходимости и оформите доступ к аудиотуру по Кемерово на 72 часа.",
    path: selectedSlug ? `/terms?tour=${selectedSlug}` : "/terms",
  })

  useEffect(() => {
    void loadTours()
      .then((nextTours) => {
        setTours(nextTours)
        const preselected = nextTours.find((tour) => tour.slug === selectedSlug) ?? nextTours[0] ?? null
        setSelectedTourId(preselected?.id ?? null)
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось подготовить checkout.")
      })
      .finally(() => setLoading(false))
  }, [selectedSlug])

  useEffect(() => {
    if (!selectedTourId) {
      return
    }

    void previewCheckout({
      tour_id: selectedTourId,
      promo_code: promoCode || undefined,
      email: email || undefined,
    })
      .then((nextPreview) => {
        setPreview(nextPreview)
        setCheckoutMessage("")
      })
      .catch((nextError) => {
        setPreview(null)
        setCheckoutMessage(nextError instanceof Error ? nextError.message : "Не удалось пересчитать стоимость.")
      })
  }, [selectedTourId])

  const selectedTour = tours.find((tour) => tour.id === selectedTourId) ?? null

  const handleRecalculate = async () => {
    if (!selectedTourId) {
      return
    }

    setCheckoutMessage("")
    setBusy(true)

    try {
      const nextPreview = await previewCheckout({
        tour_id: selectedTourId,
        promo_code: promoCode || undefined,
        email: email || undefined,
      })
      setPreview(nextPreview)
    } catch (nextError) {
      setPreview(null)
      setCheckoutMessage(nextError instanceof Error ? nextError.message : "Не удалось пересчитать стоимость.")
    } finally {
      setBusy(false)
    }
  }

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTourId) {
      setCheckoutMessage("Выберите экскурсию для оплаты.")
      return
    }

    setBusy(true)
    setCheckoutMessage("")

    try {
      const response = await createCheckoutOrder({
        tour_id: selectedTourId,
        promo_code: promoCode || undefined,
        email,
        name: name || undefined,
        accept_offer: acceptOffer,
        accept_pdn: acceptPdn,
      })

      if (response.payment_confirmation_url) {
        window.location.assign(response.payment_confirmation_url)
        return
      }

      window.location.assign(`/checkout/success?order_number=${encodeURIComponent(response.order_number)}`)
    } catch (nextError) {
      setCheckoutMessage(nextError instanceof Error ? nextError.message : "Не удалось создать заказ.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="Условия приобретения и оплата"
        title="Оплата и доступ"
        lead="Выберите экскурсию, при необходимости примените промокод и оформите доступ на 72 часа."
      />

      <section className="content-grid terms-meta-grid">
        <article className="panel tour-card">
          <p className="eyebrow">Условия покупки</p>
          <h3>Документы под рукой</h3>
          <p>
            Перед оплатой можно открыть оферту, политику обработки персональных данных
            и порядок оплаты и возвратов.
          </p>
          <div className="stack-actions">
            <a href="/offer" className="button button-secondary" target="_blank" rel="noreferrer">
              Оферта
            </a>
            <a href="/privacy" className="button button-secondary" target="_blank" rel="noreferrer">
              Политика ПДн
            </a>
            <a href={PERSONAL_DATA_CONSENT_PATH} className="button button-secondary" target="_blank" rel="noreferrer">
              Согласие на ПДн
            </a>
            <a href="/payment-policy" className="button button-secondary" target="_blank" rel="noreferrer">
              Оплата и возвраты
            </a>
          </div>
        </article>

        <article className="panel tour-card">
          <p className="eyebrow">Исполнитель</p>
          <h3>{MERCHANT.shortName}</h3>
          <p>
            Оплата проводится официально, а условия покупки и возвратов доступны в документах
            выше.
          </p>
          <p>Контакты: {MERCHANT.email}, {MERCHANT.phone}</p>
        </article>
      </section>

      <section className="checkout-grid">
        <div className="checkout-side">
          <article className="panel checkout-info">
            <h3>Что вы получите после оплаты</h3>
            <ul className="clean-list">
              <li>Все треки выбранной экскурсии на 72 часа</li>
              <li>Прослушивание без ограничений в течение срока доступа</li>
              <li>Историю заказа в личном кабинете</li>
              <li>Сообщение «Спасибо! Слушайте» после подтверждения платежа</li>
            </ul>
            <p className="section-note">
              На одну экскурсию применяется только одна скидка.
            </p>
          </article>

          <article className="panel checkout-info">
            <h3>Личный кабинет после покупки</h3>
            <p>
              Сайт запоминает покупку по электронной почте. В кабинете будут видны история
              заказов, активные доступы и срок действия экскурсии.
            </p>
          </article>
        </div>

        <article className="panel checkout-form-card">
          <h3>Оформить доступ</h3>
          {loading ? <p>Загружаем доступные экскурсии...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && !error ? (
            <form className="checkout-form" onSubmit={handleCheckout}>
              <label className="field">
                <span>Экскурсия</span>
                <select
                  className="field-select"
                  value={selectedTourId ?? ""}
                  onChange={(event) => setSelectedTourId(Number(event.target.value))}
                >
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Имя</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" />
              </label>

              <label className="field">
                <span>Электронная почта</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="field">
                <span>Промокод</span>
                <div className="inline-field">
                  <input
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value)}
                    placeholder="Если есть код скидки"
                  />
                  <button type="button" className="button button-secondary" onClick={() => void handleRecalculate()} disabled={busy}>
                    Пересчитать
                  </button>
                </div>
              </label>

              <div className="consent-list">
                <label className="consent-item">
                  <input
                    type="checkbox"
                    checked={acceptOffer}
                    onChange={(event) => setAcceptOffer(event.target.checked)}
                  />
                  <span className="consent-copy">
                    Принимаю{" "}
                    <a href="/offer" target="_blank" rel="noreferrer">
                      условия публичной оферты
                    </a>{" "}
                    и{" "}
                    <a href="/payment-policy" target="_blank" rel="noreferrer">
                      порядок оплаты и возвратов
                    </a>
                  </span>
                </label>
                <label className="consent-item">
                  <input
                    type="checkbox"
                    checked={acceptPdn}
                    onChange={(event) => setAcceptPdn(event.target.checked)}
                  />
                  <span className="consent-copy">
                    Даю{" "}
                    <a href={PERSONAL_DATA_CONSENT_PATH} target="_blank" rel="noreferrer">
                      согласие на обработку персональных данных
                    </a>{" "}
                    версии {LEGAL_DOCUMENT_VERSION} и ознакомлен с{" "}
                    <a href="/privacy" target="_blank" rel="noreferrer">
                      политикой обработки персональных данных
                    </a>
                  </span>
                </label>
              </div>

              <div className="pricing-card">
                <div>
                  <span>Экскурсия</span>
                  <strong>{selectedTour?.title || "Выберите тур"}</strong>
                </div>
                <div>
                  <span>Стоимость</span>
                  <strong>{preview ? formatRub(preview.pricing.subtotal_rub) : "—"}</strong>
                </div>
                <div>
                  <span>Скидка</span>
                  <strong>{preview ? formatRub(preview.pricing.discount_rub) : "—"}</strong>
                </div>
                <div className="pricing-total">
                  <span>Итого к оплате</span>
                  <strong>{preview ? formatRub(preview.pricing.total_rub) : "—"}</strong>
                </div>
              </div>

              {checkoutMessage ? <p className="form-error">{checkoutMessage}</p> : null}

              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy
                  ? "Создаём заказ..."
                  : preview
                    ? `Оплатить ${formatRub(preview.pricing.total_rub)}`
                    : "Перейти к оплате"}
              </button>
            </form>
          ) : null}
        </article>
      </section>
    </div>
  )
}

export function CheckoutSuccessPage() {
  const [success, setSuccess] = useState<Awaited<ReturnType<typeof loadCheckoutSuccess>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const orderNumber = new URLSearchParams(window.location.search).get("order_number") ?? ""

  useSeo({
    title: "Статус заказа",
    description: "Страница подтверждения оплаты и доступа к экскурсии Аудиогид42.",
    path: orderNumber ? `/checkout/success?order_number=${encodeURIComponent(orderNumber)}` : "/checkout/success",
    noindex: true,
  })

  useEffect(() => {
    if (!orderNumber) {
      setError("Не найден номер заказа.")
      setLoading(false)
      return
    }

    void loadCheckoutSuccess(orderNumber)
      .then(setSuccess)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось получить статус заказа.")
      })
      .finally(() => setLoading(false))
  }, [orderNumber])

  const statusLabel =
    success?.status === "refunded"
      ? "Возврат оформлен"
      : success?.status === "paid"
        ? "Оплачен"
        : success?.status || "Ожидает подтверждения"

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="После оплаты"
        title="Статус заказа и доступ к туру"
        lead="После успешной оплаты система запоминает клиента, включает треки оплаченной экскурсии и сохраняет заказ в истории кабинета."
      />

      {loading ? <section className="panel empty-state">Проверяем статус заказа...</section> : null}
      {error ? <section className="panel empty-state error-state">{error}</section> : null}

      {!loading && !error && success ? (
        <section className="checkout-grid">
          <article className="panel checkout-info">
            <h3>{success.message}</h3>
            <p>Номер заказа: {success.order_number}</p>
            <p>Статус: {statusLabel}</p>
            {success.access ? (
              <>
                <p>Доступ открыт: {formatDateTime(success.access.starts_at)}</p>
                <p>Действует до: {formatDateTime(success.access.expires_at)}</p>
              </>
            ) : (
              <p>
                {success.status === "refunded"
                  ? "Возврат подтверждён. Доступ к туру закрыт."
                  : "Платёж ожидает подтверждения или уведомление от T-Bank ещё не дошло до сайта."}
              </p>
            )}
          </article>

          <article className="panel checkout-info">
            <h3>{success.tour?.title || "Экскурсия"}</h3>
            <p>После подтверждения можно сразу перейти к карте и трекам маршрута.</p>
            <div className="cta-row">
              {success.tour?.slug ? (
                <Link
                  to="/excursions/$slug"
                  params={{ slug: success.tour.slug }}
                  className="button button-primary"
                >
                  Открыть тур
                </Link>
              ) : null}
              <Link to="/cabinet" className="button button-secondary">
                Личный кабинет
              </Link>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  )
}

export function CheckoutFailPage() {
  const [order, setOrder] = useState<Awaited<ReturnType<typeof loadCheckoutOrderStatus>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const params = new URLSearchParams(window.location.search)
  const orderNumber = params.get("order_number") ?? ""
  const tourSlug = params.get("tour") ?? getSelectedTourSlug()
  const latestPaymentStatus = order?.order.payments[0]?.status ?? null

  useSeo({
    title: "Оплата не завершена",
    description: "Страница повторной попытки оплаты экскурсии Аудиогид42.",
    path: tourSlug ? `/checkout/fail?tour=${encodeURIComponent(tourSlug)}` : "/checkout/fail",
    noindex: true,
  })

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false)
      return
    }

    void loadCheckoutOrderStatus(orderNumber)
      .then(setOrder)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось получить статус заказа.")
      })
      .finally(() => setLoading(false))
  }, [orderNumber])

  return (
    <div className="page section-page">
      <PageIntro
        eyebrow="Оплата не завершена"
        title="Не получилось оплатить"
        lead="Платёж не был подтверждён. Доступ к туру не открыт, но вы можете вернуться и попробовать оплатить снова."
      />

      {loading ? <section className="panel empty-state">Проверяем статус заказа...</section> : null}
      {error ? <section className="panel empty-state error-state">{error}</section> : null}

      {!loading ? (
        <section className="checkout-grid">
          <article className="panel checkout-info">
            <h3>Статус попытки оплаты</h3>
            <p>Номер заказа: {order?.order.order_number || orderNumber || "—"}</p>
            <p>Статус заказа: {formatOrderStatus(order?.order.status || "pending")}</p>
            <p>Платёжный провайдер: {order?.order.payment_provider || "T-Bank"}</p>
            {latestPaymentStatus ? <p>Статус ответа банка: {latestPaymentStatus}</p> : null}
            <p>Доступ к маршруту не активирован.</p>
          </article>

          <article className="panel checkout-info">
            <h3>Что можно сделать дальше</h3>
            <div className="cta-row">
              <a href={tourSlug ? `/terms?tour=${tourSlug}` : "/terms"} className="button button-primary">
                Попробовать снова
              </a>
              <Link to="/contacts" className="button button-secondary">
                Связаться с поддержкой
              </Link>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  )
}

export function ContactsPage() {
  const [type, setType] = useState<ContactRequestPayload["type"]>("feedback")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [acceptPdn, setAcceptPdn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formMessage, setFormMessage] = useState("")
  const [formError, setFormError] = useState("")

  useSeo({
    title: "Контакты Аудиогид42",
    description:
      "Свяжитесь с Аудиогид42 по вопросам покупки, доступа, претензий и размещения экскурсий.",
    path: "/contacts",
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setFormMessage("")
    setFormError("")

    try {
      const response = await submitContactRequest({
        type,
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        message,
        accept_pdn: acceptPdn,
      })

      setFormMessage(response.message)
      setMessage("")
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "Не удалось отправить обращение.")
    } finally {
      setBusy(false)
    }
  }

  return (
      <div className="page section-page">
        <PageIntro
          eyebrow="Контакты"
          title="Претензии клиентов, обратная связь и заявки экскурсоводов"
          lead="Здесь можно задать вопрос по покупке и доступу, отправить претензию или оставить заявку на размещение своей экскурсии."
        />

        <section className="content-grid">
          <article className="panel tour-card">
            <p className="eyebrow">Претензии клиентов</p>
            <h3>Возвраты и спорные ситуации</h3>
            <p>Если вопрос связан с оплатой, возвратом или доступом к экскурсии, напишите нам здесь.</p>
          </article>

          <article className="panel tour-card">
            <p className="eyebrow">Обратная связь</p>
            <h3>Поддержка пользователей</h3>
            <p>Поможем с картой, входом, историей заказов, покупкой экскурсии и работой сайта.</p>
          </article>

          <article className="panel tour-card">
            <p className="eyebrow">Новые экскурсоводы</p>
            <h3>Заявка на размещение</h3>
            <p>Если вы хотите разместить свои маршруты, аудиотреки и точки интереса, отправьте заявку.</p>
          </article>
        </section>

        <section className="checkout-grid">
          <article className="panel checkout-info">
            <h3>Какое обращение выбрать</h3>
            <ul className="clean-list">
              <li>Если нужен ответ по покупке и доступу, выберите «Обратная связь»</li>
              <li>Если вопрос связан с возвратом или спорной ситуацией, выберите «Претензия клиента»</li>
              <li>Если хотите разместить свою экскурсию, выберите «Заявка экскурсовода»</li>
            </ul>
            <div className="contact-legal-note">
              <p>Исполнитель: {MERCHANT.shortName}</p>
            <p>Email: {MERCHANT.email}</p>
            <p>Телефон: {MERCHANT.phone}</p>
          </div>
        </article>

        <article className="panel checkout-form-card">
          <h3>Отправить обращение</h3>
          <form className="checkout-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Тип обращения</span>
              <select
                className="field-select"
                value={type}
                onChange={(event) => setType(event.target.value as ContactRequestPayload["type"])}
              >
                <option value="feedback">Обратная связь</option>
                <option value="claim">Претензия клиента</option>
                <option value="guide_application">Заявка экскурсовода</option>
              </select>
            </label>

            <label className="field">
              <span>Имя</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="field">
              <span>Электронная почта</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>

            <label className="field">
              <span>Телефон</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>

            <label className="field">
              <span>Сообщение</span>
              <textarea
                className="field-textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Опишите ваш вопрос, претензию или предложение по размещению тура."
                required
              />
            </label>

            <label className="consent-item">
              <input
                type="checkbox"
                checked={acceptPdn}
                onChange={(event) => setAcceptPdn(event.target.checked)}
              />
              <span className="consent-copy">
                Даю{" "}
                <a href={PERSONAL_DATA_CONSENT_PATH} target="_blank" rel="noreferrer">
                  согласие на обработку персональных данных
                </a>{" "}
                версии {LEGAL_DOCUMENT_VERSION} и ознакомлен с{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  политикой обработки персональных данных
                </a>{" "}
                для обработки обращения
              </span>
            </label>

            {formMessage ? <p className="form-success">{formMessage}</p> : null}
            {formError ? <p className="form-error">{formError}</p> : null}

            <button type="submit" className="button button-primary wide-button" disabled={busy}>
              {busy ? "Отправляем..." : "Отправить обращение"}
            </button>
          </form>
        </article>
      </section>
    </div>
  )
}

export function NotFoundPage() {
  useSeo({
    title: "Страница не найдена",
    description: "Запрошенная страница Аудиогид42 не найдена.",
    path: "/404",
    noindex: true,
  })

  return (
    <div className="page not-found-page">
      <section className="panel not-found-card">
        <p className="eyebrow">Навигация</p>
        <h1>Такой страницы пока нет</h1>
        <p className="lede">
          Вернитесь в каталог экскурсий, карту или в кабинет, если у вас уже есть доступ к
          маршрутам.
        </p>
        <div className="cta-row">
          <Link to="/" className="button button-primary">
            О проекте
          </Link>
          <Link to="/excursions" className="button button-secondary">
            Экскурсии
          </Link>
        </div>
      </section>
    </div>
  )
}
