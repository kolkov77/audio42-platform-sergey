import { Link, useNavigate } from "@tanstack/react-router"
import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "./auth"
import {
  createAdminAdBanner,
  createAdminPayout,
  createAdminPoint,
  createAdminPromoCode,
  createAdminUser,
  deleteAdminAdBanner,
  deleteAdminPoint,
  deleteAdminTour,
  deleteGuidePoint,
  deleteGuideTrack,
  deleteGuideTour,
  createGuidePoint,
  createGuideTrack,
  createGuideTour,
  refundAdminOrder,
  loadAdminContactRequests,
  loadAdminAdBanners,
  loadAdminDashboard,
  loadAdminDynamics,
  loadAdminGuides,
  loadAdminPoints,
  loadAdminPromoCodes,
  loadAdminSalesTable,
  loadAdminSearchEngineStatus,
  loadAdminSettlements,
  loadAdminTrafficStats,
  loadAdminTours,
  loadAdminUsers,
  loadGuideDynamics,
  loadGuideDashboardSummary,
  loadGuideProfile,
  loadGuideSalesTable,
  loadGuideSettlements,
  loadGuideTourDetail,
  loadGuideTours,
  searchGuidePoints,
  syncAdminUserRoles,
  uploadGuideAudio,
  uploadGuideImage,
  updateAdminContactRequest,
  updateAdminAdBanner,
  updateAdminGuide,
  updateAdminPoint,
  updateAdminPromoCode,
  updateGuidePoint,
  updateGuideProfile,
  updateGuideTrack,
  updateAdminTour,
  updateGuideTour,
  type AdminAdBanner,
  type AdminPromoCode,
  type AdminContactRequest,
  type AdminGuideRecord,
  type AdminPointRecord,
  type AdminSearchEngineStatus,
  type AdminTourRecord,
  type AdminUserRecord,
  type GuidePointSearchRecord,
  type GuideProfileRecord,
  type GuideTrackRecord,
  type GuideTourDetail,
  type GuideTourSummary,
  type TranslationPayload,
} from "./admin-api"
import { type LocaleCode } from "./i18n"
import { YandexMap } from "./yandex-map"

type StudioSection = "tours" | "editor" | "reports"

const PUBLIC_SITE_ORIGIN = "https://audiogid42.ru"

function emptyTrackForm(tourPointId = "") {
  return {
    tour_point_id: tourPointId,
    manual_point_title: "",
    description: "",
    audio_url: "",
    audio_file: null as File | null,
    duration_seconds: "10",
    sort_order: "",
    track_type: "main" as "main" | "bonus",
    is_demo: false,
    is_published: true,
    translation_json: {} as TranslationPayload,
  }
}

function audioFileLabel(track: GuideTrackRecord) {
  if (track.audio_file_name) {
    return `Аудиофайл загружен: ${track.audio_file_name}`
  }

  return track.audio_url ? "Аудиофайл загружен" : "Аудиофайл пока не загружен"
}

function audioFileTitle(track: GuideTrackRecord) {
  return track.audio_file_name || (track.audio_url ? "Аудиофайл загружен" : "Аудиофайл пока не загружен")
}

function guideStudioUrlState() {
  if (typeof window === "undefined") {
    return { section: "tours" as StudioSection, tourId: null as number | null, pointId: null as number | null }
  }

  const params = new URLSearchParams(window.location.search)
  const sectionParam = params.get("section")
  const section: StudioSection = sectionParam === "editor" || sectionParam === "reports" ? sectionParam : "tours"
  const tourId = Number(params.get("tour"))
  const pointId = Number(params.get("point"))

  return {
    section,
    tourId: Number.isFinite(tourId) && tourId > 0 ? tourId : null,
    pointId: Number.isFinite(pointId) && pointId > 0 ? pointId : null,
  }
}

function replaceGuideStudioUrl(section: StudioSection, tourId?: number | null, pointId?: number | null) {
  if (typeof window === "undefined") {
    return
  }

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set("section", section)

  if (tourId) {
    nextUrl.searchParams.set("tour", String(tourId))
  } else {
    nextUrl.searchParams.delete("tour")
  }

  if (pointId) {
    nextUrl.searchParams.set("point", String(pointId))
  } else {
    nextUrl.searchParams.delete("point")
  }

  window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
}

function imagePreviewUrl(url: string | null | undefined) {
  if (!url) {
    return null
  }

  if (url.startsWith("/tours/")) {
    return `${PUBLIC_SITE_ORIGIN}${url}`
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url
  }

  return `/${url.replace(/^\/+/, "")}`
}

function displayUploadName(url: string | null | undefined, uploadedFileName = "") {
  if (uploadedFileName) {
    return uploadedFileName
  }

  if (!url) {
    return ""
  }

  try {
    const parsed = new URL(url, PUBLIC_SITE_ORIGIN)
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "Загруженная обложка")
  } catch {
    return decodeURIComponent(url.split(/[/?#]/).filter(Boolean).pop() || "Загруженная обложка")
  }
}

function formatCoordinates(lat: number | string | null | undefined, lng: number | string | null | undefined) {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === "" || lng === "") {
    return ""
  }

  return `${lat}, ${lng}`
}

function parseCoordinates(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return { lat: undefined, lng: undefined }
  }

  const match = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/)

  if (!match) {
    return null
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
  }
}

type PointPickerRecord = {
  id: number
  title: string
  address_text: string | null
  lat: number | null
  lng: number | null
}

function pointPickerMapPoints(points: PointPickerRecord[]) {
  return points
    .filter((point) => point.lat !== null && point.lng !== null)
    .map((point) => ({
      pointId: point.id,
      lat: Number(point.lat),
      lng: Number(point.lng),
      title: point.title,
      balloonHtml: point.address_text || "",
    }))
}

function BetaDetails({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <details className="beta-details">
      <summary>
        <span>{title}</span>
        <small>Бета</small>
      </summary>
      {description ? <p className="form-hint">{description}</p> : null}
      <div className="beta-details-body">{children}</div>
    </details>
  )
}

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function toInputDate(value: Date) {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(new Date(value))
}

type ReportDateFilters = {
  date_from: string
  date_to: string
}

type ReportPresetKey = "this_month" | "last_month" | "this_quarter" | "last_quarter"

function startOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

function endOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0)
}

function buildPresetDates(preset: ReportPresetKey): ReportDateFilters {
  const today = new Date()

  if (preset === "this_month") {
    return {
      date_from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      date_to: toInputDate(today),
    }
  }

  if (preset === "last_month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    return {
      date_from: toInputDate(monthStart),
      date_to: toInputDate(monthEnd),
    }
  }

  if (preset === "this_quarter") {
    return {
      date_from: toInputDate(startOfQuarter(today)),
      date_to: toInputDate(today),
    }
  }

  const previousQuarterPivot = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  return {
    date_from: toInputDate(startOfQuarter(previousQuarterPivot)),
    date_to: toInputDate(endOfQuarter(previousQuarterPivot)),
  }
}

function presetLabel(preset: ReportPresetKey) {
  if (preset === "this_month") return "Этот месяц"
  if (preset === "last_month") return "Прошлый месяц"
  if (preset === "this_quarter") return "Этот квартал"
  return "Прошлый квартал"
}

function galleryArrayToText(values: string[] | null | undefined) {
  return (values ?? []).join("\n")
}

function galleryTextToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function captionArrayToText(values: string[] | null | undefined) {
  return (values ?? []).join("\n")
}

function captionTextToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .slice(0, 12)
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\n")

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value)
  return normalized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function printTableReport(params: {
  title: string
  subtitle?: string
  headers: string[]
  rows: Array<Array<string | number | boolean | null | undefined>>
}) {
  const printWindow = window.open("", "_blank", "width=1200,height=900")
  if (!printWindow) {
    return
  }

  const head = params.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")
  const body = params.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")

  printWindow.document.write(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(params.title)}</title>
    <style>
      body { font-family: Georgia, "Times New Roman", serif; margin: 32px; color: #111827; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0 0 18px; color: #4b5563; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #d1d5db; padding: 8px 10px; vertical-align: top; text-align: left; }
      th { background: #f3f4f6; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(params.title)}</h1>
    ${params.subtitle ? `<p>${escapeHtml(params.subtitle)}</p>` : ""}
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function roleLabel(slug: string) {
  if (slug === "admin") return "Админ"
  if (slug === "accountant") return "Бухгалтер"
  if (slug === "guide") return "Экскурсовод"
  return slug
}

function tourStatusLabel(status: string) {
  if (status === "draft") return "Черновик"
  if (status === "published") return "Опубликован"
  if (status === "archived") return "Архив"
  return status
}

function isMissingTourError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  return message.includes("No query results") || message.includes("не найден") || message.includes("недоступен")
}

function contactRequestTypeLabel(type: string) {
  if (type === "guide_application") return "Заявка экскурсовода"
  if (type === "claim") return "Претензия"
  if (type === "support") return "Обращение в поддержку"
  if (type === "contact") return "Контактная заявка"
  return "Обращение"
}

function contactRequestStatusLabel(status: string) {
  if (status === "new") return "Новое"
  if (status === "in_progress") return "В работе"
  if (status === "closed") return "Закрыто"
  return status
}

function commerceStatusLabel(status: string | null | undefined) {
  if (!status) return "—"
  if (status === "paid") return "Оплачен"
  if (status === "pending") return "Ожидает оплаты"
  if (status === "failed") return "Ошибка оплаты"
  if (status === "cancelled") return "Отменён"
  if (status === "refunded") return "Возвращён"
  if (status === "active") return "Активен"
  if (status === "disabled") return "Отключён"
  return status
}

function analyticsSourceLabel(label: string) {
  if (label === "direct") return "Прямые переходы"
  if (label === "yandex") return "Яндекс"
  if (label === "web.telegram.org") return "Telegram"
  if (label === "pay.tbank.ru") return "T-Банк"
  return label
}

function useRequireRoles(roleSlugs: string[]) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" })
    }
  }, [loading, navigate, user])

  const hasRole = !!user && user.roles.some((role) => roleSlugs.includes(role.slug))

  return {
    user,
    loading,
    hasRole,
  }
}

function BackofficeGate({
  title,
  allowed,
  loading,
  children,
}: {
  title: string
  allowed: boolean
  loading: boolean
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="page section-page">
        <section className="panel empty-state">Проверяем права для раздела «{title}»...</section>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="page section-page">
        <section className="panel empty-state error-state">
          Недостаточно прав для раздела «{title}».
        </section>
      </div>
    )
  }

  return <>{children}</>
}

export function BackofficeHomePage() {
  const { user, loading, hasRole } = useRequireRoles(["admin", "accountant", "guide"])
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof loadAdminDashboard>> | null>(null)
  const [dynamics, setDynamics] = useState<Awaited<ReturnType<typeof loadAdminDynamics>> | null>(null)
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadAdminSettlements>> | null>(null)
  const [guideSummary, setGuideSummary] = useState<Awaited<ReturnType<typeof loadGuideDashboardSummary>> | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) {
      return
    }

    setError("")

    if (user.roles.some((role) => ["admin", "accountant"].includes(role.slug))) {
      void Promise.all([loadAdminDashboard(), loadAdminDynamics(), loadAdminSettlements()])
        .then(([nextDashboard, nextDynamics, nextSettlements]) => {
          setDashboard(nextDashboard)
          setDynamics(nextDynamics)
          setSettlements(nextSettlements)
        })
        .catch((nextError) => {
          setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить админ-данные.")
        })
    }

    if (user.roles.some((role) => role.slug === "guide")) {
      void loadGuideDashboardSummary()
        .then(setGuideSummary)
        .catch((nextError) => {
          setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить данные экскурсовода.")
        })
    }
  }, [user])

  return (
    <BackofficeGate title="Главная кабинета" allowed={hasRole} loading={loading}>
      <div className="page cabinet-page">
        <section className="admin-hero">
          <div className="admin-copy">
            <p className="eyebrow">Закрытый кабинет</p>
            <h1>Кабинет Аудиогид42</h1>
            <p className="lede">
              Отдельный контур для ролей: Админ, Бухгалтер и Экскурсовод, без ссылки с публичного сайта.
            </p>
          </div>
        </section>

        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="stats-grid">
          <article className="stat-tile sales">
            <span>Мои роли</span>
            <strong>{user?.roles.length ?? 0}</strong>
            <em>{user?.roles.map((role) => roleLabel(role.slug)).join(", ") || "—"}</em>
          </article>
          <article className="stat-tile views">
            <span>{dashboard ? "Заходы" : "Оплачено"}</span>
            <strong>{dashboard ? dashboard.summary.visits_count : guideSummary ? formatRub(guideSummary.summary.sales_rub) : "—"}</strong>
            <em>{dashboard ? "просмотров страниц в публичном контуре" : "оборот в доступном вам контуре"}</em>
          </article>
          <article className="stat-tile guides">
            <span>{dashboard ? "Точки входа" : "Туры"}</span>
            <strong>{dashboard ? dashboard.summary.entry_points_count : guideSummary ? guideSummary.summary.tours_count : "—"}</strong>
            <em>{dashboard ? "первых входов в публичный контур" : "ваши туры"}</em>
          </article>
          <article className="stat-tile access">
            <span>Следующий шаг</span>
            <strong>{user?.roles.some((role) => role.slug === "admin") ? "Управление" : user?.roles.some((role) => role.slug === "guide") ? "Студия" : "Отчёты"}</strong>
            <em>контур зависит от вашей роли</em>
          </article>
        </section>

        <section className="admin-grid">
          {dashboard ? (
            <article className="panel admin-module">
              <div className="module-head">
                <span className="module-tag">Админ / Бухгалтер</span>
              </div>
              <h3>Сводка системы</h3>
              <p>Оплаченных заказов: {dashboard.summary.orders_paid_count}</p>
              <p>Пользователей: {dashboard.summary.users_count}</p>
              <p>Экскурсоводов: {dashboard.summary.guides_count}</p>
            </article>
          ) : null}

          {guideSummary ? (
            <article className="panel admin-module">
              <div className="module-head">
                <span className="module-tag">Экскурсовод</span>
              </div>
              <h3>{guideSummary.guide.display_name}</h3>
              <p>Продажи: {formatRub(guideSummary.summary.sales_rub)}</p>
              <p>Вознаграждение: {formatRub(guideSummary.summary.reward_rub)}</p>
              <p>Доступно к выводу: {guideSummary.summary.eligible_for_withdrawal ? "Да" : "Порог не достигнут"}</p>
            </article>
          ) : null}

            {dynamics ? (
              <article className="panel admin-module">
                <div className="module-head">
                  <span className="module-tag">Динамика</span>
              </div>
              <h3>Последние точки продаж</h3>
                <div className="stack-list">
                  {dynamics.rows.slice(-4).reverse().map((row) => (
                    <div key={row.date} className="stack-card">
                      <strong>{row.date}</strong>
                      <p>{row.orders_count} заказов, {formatRub(row.sales_rub)}</p>
                      <p>{row.visits_count} заходов · {row.entry_points_count} точек входа</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {dashboard?.notes.traffic_analytics ? (
              <article className="panel admin-module">
                <div className="module-head">
                  <span className="module-tag">Заходы и точки входа</span>
                </div>
                <h3>Статус веб-аналитики</h3>
                <p>{dashboard.notes.traffic_analytics}</p>
                <div className="stack-list">
                  <div className="stack-card">
                    <strong>Топ источников входа</strong>
                    {dashboard.notes.top_entry_sources.length ? (
                      dashboard.notes.top_entry_sources.map((row) => (
                        <p key={row.label}>
                          {analyticsSourceLabel(row.label)} В· {row.hits}
                        </p>
                      ))
                    ) : (
                      <p>Пока нет данных о входах.</p>
                    )}
                  </div>
                  <div className="stack-card">
                    <strong>Топ страниц входа</strong>
                    {dashboard.notes.top_landing_pages.length ? (
                      dashboard.notes.top_landing_pages.map((row) => (
                        <p key={row.path}>
                          {row.path} В· {row.hits}
                        </p>
                      ))
                    ) : (
                      <p>Пока нет данных о посадочных страницах.</p>
                    )}
                  </div>
                </div>
              </article>
            ) : null}

          {settlements ? (
            <article className="panel admin-module wide">
              <div className="module-head">
                <span className="module-tag">Ведомость расчётов</span>
              </div>
              <h3>Авто-часть по экскурсоводам</h3>
              <div className="order-history">
                {settlements.rows.map((row) => (
                  <article key={row.guide_id} className="order-row">
                    <div>
                    <strong>{row.guide_name}</strong>
                      <p>Продажи с учётом скидок</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.sales_rub)}</strong>
                      <p>База для расчёта</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.reward_rub)}</strong>
                      <p>{row.reward_percent}% вознаграждение</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.balance_rub)}</strong>
                      <p>Ручные выплаты пока не заведены</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </BackofficeGate>
  )
}

export function AdminPromoCodesPage() {
  const { loading, hasRole } = useRequireRoles(["admin", "accountant"])
  const [promoCodes, setPromoCodes] = useState<AdminPromoCode[]>([])
  const [tours, setTours] = useState<AdminTourRecord[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name_internal: "",
    code: "",
    discount_type: "fixed" as "fixed" | "percent" | "fixed_price",
    discount_value: "300",
    scope_type: "all_tours" as "all_tours" | "selected_tours",
    starts_at: "",
    ends_at: "",
    is_active: true,
    tour_ids: [] as number[],
  })

  const refresh = async () => {
    const [promoPayload, toursPayload] = await Promise.all([loadAdminPromoCodes(), loadAdminTours()])
    setPromoCodes(promoPayload.promo_codes)
    setTours(toursPayload.tours)
  }

  useEffect(() => {
    if (hasRole) {
      void refresh().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить скидки.")
      })
    }
  }, [hasRole])

  const resetForm = () => {
    setEditingPromoId(null)
    setForm({
      name_internal: "",
      code: "",
      discount_type: "fixed",
      discount_value: "300",
      scope_type: "all_tours",
      starts_at: "",
      ends_at: "",
      is_active: true,
      tour_ids: [],
    })
  }

  const togglePromoTour = (tourId: number) => {
    setForm((current) => ({
      ...current,
      tour_ids: current.tour_ids.includes(tourId)
        ? current.tour_ids.filter((item) => item !== tourId)
        : [...current.tour_ids, tourId],
    }))
  }

  const startPromoEdit = (promo: AdminPromoCode) => {
    setEditingPromoId(promo.id)
    setForm({
      name_internal: promo.name_internal,
      code: promo.code,
      discount_type: promo.discount_type as "fixed" | "percent" | "fixed_price",
      discount_value: String(promo.discount_value),
      scope_type: promo.scope_type as "all_tours" | "selected_tours",
      starts_at: promo.starts_at ? promo.starts_at.slice(0, 10) : "",
      ends_at: promo.ends_at ? promo.ends_at.slice(0, 10) : "",
      is_active: promo.is_active,
      tour_ids: promo.tour_ids,
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    setError("")

    try {
      const payload = {
        name_internal: form.name_internal,
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        scope_type: form.scope_type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_active: form.is_active,
        tour_ids: form.scope_type === "selected_tours" ? form.tour_ids : [],
      }

      if (editingPromoId) {
        await updateAdminPromoCode(editingPromoId, payload)
        setMessage("Промокод обновлён.")
      } else {
        await createAdminPromoCode(payload)
        setMessage("Промокод создан.")
      }
      resetForm()
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить промокод.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <BackofficeGate title="Промокоды" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Промо-скидки</h1>
          <p className="lede">Реестр скидок: код, размер, период, активность и область действия.</p>
        </section>

        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>{editingPromoId ? "Редактировать промокод" : "Создать промокод"}</h3>
            <form className="checkout-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Внутреннее название</span>
                <input value={form.name_internal} onChange={(event) => setForm({ ...form, name_internal: event.target.value })} required />
              </label>
              <label className="field">
                <span>Кодовое слово</span>
                <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              </label>
              <label className="field">
                <span>Тип скидки</span>
                <select className="field-select" value={form.discount_type} onChange={(event) => setForm({ ...form, discount_type: event.target.value as "fixed" | "percent" | "fixed_price" })}>
                  <option value="fixed">В рублях</option>
                  <option value="percent">В процентах</option>
                  <option value="fixed_price">Финальная цена в рублях</option>
                </select>
              </label>
              <label className="field">
                <span>Размер</span>
                <input value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: event.target.value })} required />
              </label>
              <label className="field">
                <span>Область действия</span>
                <select className="field-select" value={form.scope_type} onChange={(event) => setForm({ ...form, scope_type: event.target.value as "all_tours" | "selected_tours" })}>
                  <option value="all_tours">Все экскурсии</option>
                  <option value="selected_tours">Выбранные экскурсии</option>
                </select>
              </label>
              <div className="inline-field">
                <label className="field">
                  <span>Период с</span>
                  <input type="date" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
                </label>
                <label className="field">
                  <span>Период по</span>
                  <input type="date" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
                </label>
              </div>
              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                <span>Промокод активен</span>
              </label>
              {form.scope_type === "selected_tours" ? (
                <div className="stack-list">
                  <strong>Выбрать туры</strong>
                  {tours.map((tour) => (
                    <label key={tour.id} className="consent-item">
                      <input
                        type="checkbox"
                        checked={form.tour_ids.includes(tour.id)}
                        onChange={() => togglePromoTour(tour.id)}
                      />
                      <span>{tour.title}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <div className="stack-actions">
                <button type="submit" className="button button-primary wide-button" disabled={busy}>
                  {busy ? "Сохраняем..." : editingPromoId ? "Сохранить" : "Создать"}
                </button>
                {editingPromoId ? (
                  <button type="button" className="button button-secondary wide-button" onClick={resetForm} disabled={busy}>
                    Отменить
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Текущие коды</h3>
            <div className="stack-list">
              {promoCodes.map((promo) => (
                <div key={promo.id} className="stack-card">
                  <strong>{promo.code}</strong>
                  <p>{promo.name_internal}</p>
                  <p>
                    {promo.discount_type === "fixed"
                      ? formatRub(promo.discount_value)
                      : promo.discount_type === "fixed_price"
                        ? `Итог ${formatRub(promo.discount_value)}`
                        : `${promo.discount_value}%`} · {promo.is_active ? "Активен" : "Отключён"}
                  </p>
                  <p>
                    {promo.starts_at ? promo.starts_at.slice(0, 10) : "Без ограничения"} — {promo.ends_at ? promo.ends_at.slice(0, 10) : "без даты окончания"}
                  </p>
                  <p>
                    {promo.scope_type === "all_tours"
                      ? "Все экскурсии"
                      : promo.tours.map((tour) => tour.title).filter(Boolean).join(", ") || "Выбранные экскурсии"}
                  </p>
                  <div className="stack-actions">
                    <button type="button" className="mini-button" onClick={() => startPromoEdit(promo)}>
                      Редактировать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </BackofficeGate>
  )
}

const AD_BANNER_PAGE_OPTIONS: Array<{
  key: AdminAdBanner["page_key"]
  label: string
  slots: Array<{
    key: AdminAdBanner["slot_key"]
    label: string
  }>
}> = [
  {
    key: "excursions",
    label: "Каталог прогулок",
    slots: [
      { key: "block_start", label: "В начале блока" },
      { key: "block_middle", label: "В середине блока" },
      { key: "block_end", label: "Внизу блока" },
    ],
  },
  {
    key: "tour",
    label: "Страница прогулки",
    slots: [
      { key: "block_start", label: "В начале блока" },
      { key: "block_middle", label: "В середине блока" },
      { key: "block_end", label: "Внизу блока" },
    ],
  },
  {
    key: "guide",
    label: "Страница автора",
    slots: [
      { key: "block_start", label: "В начале блока" },
      { key: "block_middle", label: "В середине блока" },
      { key: "block_end", label: "Внизу блока" },
    ],
  },
]

function adBannerPageLabel(pageKey: AdminAdBanner["page_key"]) {
  return AD_BANNER_PAGE_OPTIONS.find((page) => page.key === pageKey)?.label ?? pageKey
}

function adBannerSlotLabel(pageKey: AdminAdBanner["page_key"], slotKey: AdminAdBanner["slot_key"]) {
  const slotLabel = AD_BANNER_PAGE_OPTIONS.find((page) => page.key === pageKey)?.slots.find((slot) => slot.key === slotKey)?.label

  if (slotLabel) {
    return slotLabel
  }

  if (slotKey === "after_second_card" || slotKey === "after_route") {
    return "В середине блока"
  }

  if (slotKey === "after_intro" || slotKey === "after_hero") {
    return "Внизу блока"
  }

  return slotKey
}

export function AdminAdBannersPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [banners, setBanners] = useState<AdminAdBanner[]>([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name_internal: "",
    page_key: "excursions" as AdminAdBanner["page_key"],
    slot_key: "block_end" as AdminAdBanner["slot_key"],
    target_url: "",
    alt_text: "",
    is_active: true,
  })

  const selectedPage = AD_BANNER_PAGE_OPTIONS.find((page) => page.key === form.page_key) ?? AD_BANNER_PAGE_OPTIONS[0]

  const refresh = async () => {
    const payload = await loadAdminAdBanners()
    setBanners(payload.ad_banners)
  }

  useEffect(() => {
    if (hasRole) {
      void refresh().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить рекламные баннеры.")
      })
    }
  }, [hasRole])

  const resetForm = () => {
    setBannerFile(null)
    setForm({
      name_internal: "",
      page_key: "excursions",
      slot_key: "block_end",
      target_url: "",
      alt_text: "",
      is_active: true,
    })
  }

  const handlePageChange = (pageKey: AdminAdBanner["page_key"]) => {
    const nextPage = AD_BANNER_PAGE_OPTIONS.find((page) => page.key === pageKey) ?? AD_BANNER_PAGE_OPTIONS[0]
    setForm((current) => ({
      ...current,
      page_key: nextPage.key,
      slot_key: nextPage.slots[0].key,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bannerFile) {
      setError("Загрузите файл баннера.")
      return
    }

    setBusy(true)
    setMessage("")
    setError("")

    try {
      const upload = await uploadGuideImage(bannerFile, "ad-banner")
      await createAdminAdBanner({
        name_internal: form.name_internal,
        page_key: form.page_key,
        slot_key: form.slot_key,
        image_url: upload.url,
        target_url: form.target_url,
        alt_text: form.alt_text.trim() || null,
        is_active: form.is_active,
      })
      setMessage("Баннер добавлен.")
      resetForm()
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить баннер.")
    } finally {
      setBusy(false)
    }
  }

  const toggleBanner = async (banner: AdminAdBanner) => {
    setBusy(true)
    setMessage("")
    setError("")

    try {
      await updateAdminAdBanner(banner.id, { is_active: !banner.is_active })
      setMessage(banner.is_active ? "Баннер выключен." : "Баннер включен.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить статус баннера.")
    } finally {
      setBusy(false)
    }
  }

  const deleteBanner = async (banner: AdminAdBanner) => {
    if (!window.confirm(`Удалить баннер "${banner.name_internal}"?`)) {
      return
    }

    setBusy(true)
    setMessage("")
    setError("")

    try {
      await deleteAdminAdBanner(banner.id)
      setMessage("Баннер удален.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить баннер.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <BackofficeGate title="Реклама" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Реклама</h1>
          <p className="lede">
            Добавляйте горизонтальные баннеры формата 1:2,5 и выбирайте заранее подготовленное место показа на сайте.
          </p>
        </section>

        <section className="checkout-grid ad-banner-admin-grid">
          <article className="panel checkout-form-card">
            <h3>Добавить баннер</h3>
            <form className="checkout-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Внутреннее название</span>
                <input value={form.name_internal} onChange={(event) => setForm({ ...form, name_internal: event.target.value })} required />
              </label>
              <label className="field">
                <span>Страница</span>
                <select className="field-select" value={form.page_key} onChange={(event) => handlePageChange(event.target.value as AdminAdBanner["page_key"])}>
                  {AD_BANNER_PAGE_OPTIONS.map((page) => (
                    <option key={page.key} value={page.key}>
                      {page.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Место показа</span>
                <select className="field-select" value={form.slot_key} onChange={(event) => setForm({ ...form, slot_key: event.target.value as AdminAdBanner["slot_key"] })}>
                  {selectedPage.slots.map((slot) => (
                    <option key={slot.key} value={slot.key}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Файл баннера</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)} required />
              </label>
              <label className="field">
                <span>Ссылка перехода</span>
                <input type="url" value={form.target_url} onChange={(event) => setForm({ ...form, target_url: event.target.value })} placeholder="https://..." required />
              </label>
              <label className="field">
                <span>Текст для доступности</span>
                <input value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} placeholder="Необязательно" />
              </label>
              <label className="consent-item">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                <span>Показывать сразу после сохранения</span>
              </label>
              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy ? "Сохраняем..." : "Добавить баннер"}
              </button>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Загруженные баннеры</h3>
            <div className="stack-list">
              {banners.length === 0 ? <p>Баннеров пока нет.</p> : null}
              {banners.map((banner) => (
                <div key={banner.id} className="stack-card ad-banner-admin-card">
                  <img src={banner.image_url} alt={banner.alt_text || banner.name_internal} className="ad-banner-admin-preview" />
                  <strong>{banner.name_internal}</strong>
                  <p>{adBannerPageLabel(banner.page_key)}</p>
                  <p>{adBannerSlotLabel(banner.page_key, banner.slot_key)}</p>
                  <p>{banner.is_active ? "Включен" : "Выключен"}</p>
                  <a href={banner.target_url} target="_blank" rel="noreferrer" className="mini-link">
                    Открыть ссылку
                  </a>
                  <div className="stack-actions">
                    <button type="button" className="mini-button" onClick={() => void toggleBanner(banner)} disabled={busy}>
                      {banner.is_active ? "Выключить" : "Включить"}
                    </button>
                    <button type="button" className="mini-button" onClick={() => void deleteBanner(banner)} disabled={busy}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </BackofficeGate>
  )
}

export function AdminUsersPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [roles, setRoles] = useState<Array<{ id: number; slug: string; name: string }>>([])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role_slugs: [] as string[],
    guide_reward_percent: "40",
  })

  const refresh = async () => {
    const payload = await loadAdminUsers()
    setUsers(payload.users)
    setRoles(payload.roles)
  }

  useEffect(() => {
    if (hasRole) {
      void refresh().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить пользователей.")
      })
    }
  }, [hasRole])

  const toggleRole = (slug: string) => {
    setForm((current) => ({
      ...current,
      role_slugs: current.role_slugs.includes(slug)
        ? current.role_slugs.filter((item) => item !== slug)
        : [...current.role_slugs, slug],
    }))
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    if (form.role_slugs.length === 0) {
      setError("Выберите хотя бы одну роль пользователя.")
      setBusy(false)
      return
    }

    try {
      await createAdminUser({
        ...form,
        guide_reward_percent: form.role_slugs.includes("guide") ? Number(form.guide_reward_percent || 40) : undefined,
      })
      setMessage("Пользователь создан.")
      setForm({ name: "", email: "", password: "", role_slugs: [], guide_reward_percent: "40" })
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать пользователя.")
    } finally {
      setBusy(false)
    }
  }

  const handleQuickRoleSync = async (userId: number, roleSlug: string, nextChecked: boolean, currentRoles: string[]) => {
    const nextRoles = nextChecked
      ? [...currentRoles, roleSlug]
      : currentRoles.filter((item) => item !== roleSlug)

    try {
      await syncAdminUserRoles(userId, nextRoles)
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить роли.")
    }
  }

  return (
    <BackofficeGate title="Пользователи и роли" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Пользователи и роли</h1>
          <p className="lede">Создание логина и пароля для бухгалтера и экскурсовода, плюс управление ролями.</p>
        </section>

        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>Создать пользователя</h3>
            <form className="checkout-form" onSubmit={handleCreate}>
              <label className="field">
                <span>Имя</span>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label className="field">
                <span>Почта</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
              </label>
              <label className="field">
                <span>Пароль</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  minLength={8}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
                <small>Минимум 8 символов.</small>
              </label>
              <label className="password-toggle">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                />
                <span>Показать пароль</span>
              </label>
              <div className="consent-list">
                {roles.map((role) => (
                  <label key={role.id} className="consent-item">
                    <input type="checkbox" checked={form.role_slugs.includes(role.slug)} onChange={() => toggleRole(role.slug)} />
                    <span>{roleLabel(role.slug)}</span>
                  </label>
                ))}
              </div>
              {form.role_slugs.includes("guide") ? (
                <label className="field">
                  <span>Вознаграждение экскурсовода, %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.guide_reward_percent}
                    onChange={(event) => setForm({ ...form, guide_reward_percent: event.target.value })}
                  />
                  <small>По умолчанию 40%. Используется в отчетах и расчетах.</small>
                </label>
              ) : null}
              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy ? "Создаём..." : "Создать пользователя"}
              </button>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Существующие аккаунты</h3>
            <div className="stack-list">
              {users.map((record) => {
                const currentRoleSlugs = record.roles.map((role) => role.slug)

                return (
                  <div key={record.id} className="stack-card">
                    <strong>{record.name}</strong>
                    <p>{record.email}</p>
                    <p>{record.roles.map((role) => roleLabel(role.slug)).join(", ") || "Без ролей"}</p>
                    {record.guide ? <p>Вознаграждение: {record.guide.reward_percent}%</p> : null}
                    <div className="consent-list">
                      {roles.map((role) => (
                        <label key={`${record.id}-${role.id}`} className="consent-item">
                          <input
                            type="checkbox"
                            checked={currentRoleSlugs.includes(role.slug)}
                            onChange={(event) =>
                              void handleQuickRoleSync(record.id, role.slug, event.target.checked, currentRoleSlugs)
                            }
                          />
                          <span>{roleLabel(role.slug)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        </section>
      </div>
    </BackofficeGate>
  )
}

export function GuideStudioPage() {
  const { loading, hasRole } = useRequireRoles(["guide"])
  const initialUrlStateRef = useRef(guideStudioUrlState())
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof loadGuideDashboardSummary>> | null>(null)
  const [dynamics, setDynamics] = useState<Awaited<ReturnType<typeof loadGuideDynamics>> | null>(null)
  const [salesRows, setSalesRows] = useState<Awaited<ReturnType<typeof loadGuideSalesTable>>["rows"]>([])
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadGuideSettlements>> | null>(null)
  const [tours, setTours] = useState<GuideTourSummary[]>([])
  const [selectedTourId, setSelectedTourId] = useState<number | null>(initialUrlStateRef.current.tourId)
  const [selectedTour, setSelectedTour] = useState<GuideTourDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [studioSection, setStudioSection] = useState<StudioSection>(initialUrlStateRef.current.section)
  const [busy, setBusy] = useState(false)
  const [editorBusy, setEditorBusy] = useState(false)
  const [pointBusy, setPointBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [coverDragActive, setCoverDragActive] = useState(false)
  const [coverFileName, setCoverFileName] = useState("")
  const [trackBusy, setTrackBusy] = useState(false)
  const [pointSearchBusy, setPointSearchBusy] = useState(false)
  const [pointSearchResults, setPointSearchResults] = useState<GuidePointSearchRecord[]>([])
  const [editingPointId, setEditingPointId] = useState<number | null>(null)
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [trackInputKey, setTrackInputKey] = useState(0)
  const [pointAudioInputKey, setPointAudioInputKey] = useState(0)
  const [pendingPointAudioFile, setPendingPointAudioFile] = useState<File | null>(null)
  const initialPointIdRef = useRef(initialUrlStateRef.current.pointId)
  const editorRef = useRef<HTMLElement | null>(null)
  const pointEditorRef = useRef<HTMLElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const pointGalleryInputRef = useRef<HTMLInputElement | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportFilters, setReportFilters] = useState({
    tour_id: "",
    ...buildPresetDates("this_month"),
  })
  const [form, setForm] = useState({
    title: "",
    price_rub: "1500",
    short_description: "",
    full_description: "",
    audience_description: "",
    duration_minutes: "120",
    cover_image_url: "",
    gallery_text: "",
  })
  const [tourEditor, setTourEditor] = useState({
    title: "",
    price_rub: "1500",
    short_description: "",
    full_description: "",
    audience_description: "",
    duration_minutes: "",
    cover_image_url: "",
    gallery_text: "",
    translation_json: {} as TranslationPayload,
    enabled_locales: ["ru"] as LocaleCode[],
    status: "draft" as "draft" | "published" | "archived",
  })
  const [pointForm, setPointForm] = useState({
    mode: "existing" as "existing" | "new",
    search_query: "",
    point_id: "",
    title: "",
    description: "",
    address_text: "",
    coordinates: "",
    gallery_text: "",
    gallery_caption_text: "",
    sort_order: "",
    title_override: "",
    description_override: "",
    translation_json: {} as TranslationPayload,
    is_route_visible: true,
  })
  const [trackForm, setTrackForm] = useState(emptyTrackForm())

  const refresh = async () => {
    const [nextSummary, nextTours] = await Promise.all([loadGuideDashboardSummary(), loadGuideTours()])
    setSummary(nextSummary)
    setTours(nextTours.tours)
    setSelectedTourId((current) => {
      if (nextTours.tours.length === 0) {
        return null
      }

      if (current && nextTours.tours.some((tour) => tour.id === current)) {
        return current
      }

      return nextTours.tours[0].id
    })
  }

  const refreshReports = async (nextFilters = reportFilters) => {
    const payload = {
      tour_id: nextFilters.tour_id ? Number(nextFilters.tour_id) : undefined,
      date_from: nextFilters.date_from || undefined,
      date_to: nextFilters.date_to || undefined,
    }

    const [nextDynamics, nextSales, nextSettlements] = await Promise.all([
      loadGuideDynamics(payload),
      loadGuideSalesTable(payload),
      loadGuideSettlements({
        date_from: payload.date_from,
        date_to: payload.date_to,
      }),
    ])

    setDynamics(nextDynamics)
    setSalesRows(nextSales.rows)
    setSettlements(nextSettlements)
  }

  const refreshSelectedTour = async (tourId: number) => {
    const payload = await loadGuideTourDetail(tourId)
    setSelectedTour(payload.tour)
  }

  useEffect(() => {
    if (hasRole) {
      void Promise.all([
        refresh(),
        refreshReports(),
        searchGuidePoints("").then((payload) => setPointSearchResults(payload.points)),
      ])
        .catch((nextError) => {
          setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить студию экскурсовода.")
        })
    }
  }, [hasRole])

  useEffect(() => {
    const tourIdForUrl = studioSection === "editor" ? selectedTourId : null
    const pointIdForUrl = studioSection === "editor" ? editingPointId : null

    replaceGuideStudioUrl(studioSection, tourIdForUrl, pointIdForUrl)
  }, [studioSection, selectedTourId, editingPointId])

  useEffect(() => {
    if (!hasRole || !selectedTourId) {
      setSelectedTour(null)
      return
    }

    setDetailLoading(true)
    void loadGuideTourDetail(selectedTourId)
      .then((payload) => {
        setSelectedTour(payload.tour)
      })
      .catch((nextError) => {
        if (isMissingTourError(nextError)) {
          setSelectedTourId(null)
          setSelectedTour(null)
          setError("Этот тур уже удалён или недоступен для текущего экскурсовода. Обновите список и выберите другой тур.")
          void refresh()
          return
        }

        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить детали тура.")
      })
      .finally(() => setDetailLoading(false))
  }, [hasRole, selectedTourId])

  useEffect(() => {
    if (!selectedTour) {
      return
    }

    setTourEditor({
      title: selectedTour.title,
      price_rub: String(selectedTour.price_rub),
      short_description: selectedTour.short_description || "",
      full_description: selectedTour.full_description || "",
      audience_description: selectedTour.audience_description || "",
      duration_minutes: selectedTour.duration_minutes ? String(selectedTour.duration_minutes) : "",
      cover_image_url: selectedTour.cover_image_url || "",
      gallery_text: galleryArrayToText(selectedTour.gallery_image_urls),
      translation_json: selectedTour.translation_json ?? {},
      enabled_locales: selectedTour.enabled_locales?.length ? selectedTour.enabled_locales : ["ru"],
      status: selectedTour.status as "draft" | "published" | "archived",
    })
  }, [selectedTour])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    setError("")

    try {
      const response = await createGuideTour({
        title: form.title,
        price_rub: Number(form.price_rub),
        short_description: form.short_description || undefined,
        full_description: form.full_description || undefined,
        audience_description: form.audience_description || undefined,
        duration_minutes: Number(form.duration_minutes) || undefined,
        cover_image_url: form.cover_image_url || undefined,
        gallery_json: galleryTextToArray(form.gallery_text),
      })
      setMessage("Тур создан как черновик. Редактор открыт: добавьте обложку, остановки и аудиотреки.")
      setForm({
        title: "",
        price_rub: "1500",
        short_description: "",
        full_description: "",
        audience_description: "",
        duration_minutes: "120",
        cover_image_url: "",
        gallery_text: "",
      })
      await refresh()
      setSelectedTourId(response.tour.id)
      setEditingPointId(null)
      setEditingTrackId(null)
      await refreshSelectedTour(response.tour.id)
      setStudioSection("editor")
      window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать тур.")
    } finally {
      setBusy(false)
    }
  }

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) {
      return undefined
    }

    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : undefined
  }

  const appendLine = (value: string, nextLine: string) =>
    [...galleryTextToArray(value), nextLine].join("\n")

  const handleUploadCover = async (file: File | null) => {
    if (!file) {
      return
    }

    setImageBusy(true)
    setMessage("")
    setError("")

    try {
      const payload = await uploadGuideImage(file, "tour-cover")
      const nextCoverUrl = payload.url
      setTourEditor((current) => ({ ...current, cover_image_url: nextCoverUrl }))
      setForm((current) => ({ ...current, cover_image_url: nextCoverUrl }))
      if (selectedTourId) {
        await updateGuideTour(selectedTourId, { cover_image_url: nextCoverUrl })
        setSelectedTour((current) => (current ? { ...current, cover_image_url: nextCoverUrl } : current))
      }
      setCoverFileName(file.name)
      setMessage(selectedTourId ? "Обложка загружена и сохранена в туре." : "Обложка загружена. Сохраните тур, чтобы закрепить ее.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить обложку.")
    } finally {
      setImageBusy(false)
      if (coverInputRef.current) {
        coverInputRef.current.value = ""
      }
    }
  }

  const handleCoverDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (imageBusy) {
      return
    }

    setCoverDragActive(event.type === "dragenter" || event.type === "dragover")
  }

  const handleCoverDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setCoverDragActive(false)

    if (imageBusy) {
      return
    }

    void handleUploadCover(event.dataTransfer.files?.[0] ?? null)
  }

  const handleClearCover = () => {
    setTourEditor((current) => ({ ...current, cover_image_url: "" }))
    setCoverFileName("")

    if (coverInputRef.current) {
      coverInputRef.current.value = ""
    }
  }

  const handleUploadPointGallery = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    setImageBusy(true)
    setMessage("")
    setError("")

    try {
      let nextGallery = pointForm.gallery_text

      for (const file of Array.from(files)) {
        const payload = await uploadGuideImage(file, "point-gallery")
        nextGallery = appendLine(nextGallery, payload.url)
      }

      setPointForm((current) => ({ ...current, gallery_text: nextGallery }))
      setMessage("Фотографии остановки загружены. Сохраните точку, чтобы закрепить их.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить фотографии остановки.")
    } finally {
      setImageBusy(false)
      if (pointGalleryInputRef.current) {
        pointGalleryInputRef.current.value = ""
      }
    }
  }

  const handleSaveTour = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTourId) {
      return
    }

    setEditorBusy(true)
    setMessage("")
    setError("")

    try {
      await updateGuideTour(selectedTourId, {
        title: tourEditor.title,
        price_rub: Number(tourEditor.price_rub),
        short_description: tourEditor.short_description || null,
        full_description: tourEditor.full_description || null,
        audience_description: tourEditor.audience_description || null,
        duration_minutes: parseOptionalNumber(tourEditor.duration_minutes) ?? null,
        cover_image_url: tourEditor.cover_image_url || null,
        gallery_json: galleryTextToArray(tourEditor.gallery_text),
        translation_json: tourEditor.translation_json,
        enabled_locales_json: tourEditor.enabled_locales,
        status: tourEditor.status,
      })
      setMessage("Тур обновлён.")
      await refresh()
      const payload = await loadGuideTourDetail(selectedTourId)
      setSelectedTour(payload.tour)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить тур.")
    } finally {
      setEditorBusy(false)
    }
  }

  const handleOpenTourEditor = (tourId: number) => {
    setSelectedTourId(tourId)
    setEditingPointId(null)
    setEditingTrackId(null)
    setStudioSection("editor")
    void refreshSelectedTour(tourId).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить детали тура.")
    })
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const handleReportPreset = async (preset: ReportPresetKey) => {
    const presetDates = buildPresetDates(preset)
    const nextFilters = {
      ...reportFilters,
      ...presetDates,
    }

    setReportFilters(nextFilters)
    setReportBusy(true)
    setMessage("")
    setError("")

    try {
      await refreshReports(nextFilters)
      setMessage(`Отчёты экскурсовода обновлены: ${presetLabel(preset).toLowerCase()}.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить отчёты экскурсовода.")
    } finally {
      setReportBusy(false)
    }
  }

  const handleApplyReportFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReportBusy(true)
    setMessage("")
    setError("")

    try {
      await refreshReports(reportFilters)
      setMessage("Отчёты экскурсовода обновлены.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить отчёты экскурсовода.")
    } finally {
      setReportBusy(false)
    }
  }

  const handleDeleteTour = async (tourId: number) => {
    if (!window.confirm("Удалить тур? Если по нему уже были продажи, система переведёт его в архив.")) {
      return
    }

    setBusy(true)
    setMessage("")
    setError("")

    try {
      const response = await deleteGuideTour(tourId)
      setMessage(response.message)
      if (selectedTourId === tourId) {
        setSelectedTourId(null)
        setSelectedTour(null)
      }
      await Promise.all([refresh(), refreshReports()])
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить тур.")
    } finally {
      setBusy(false)
    }
  }

  const handlePointSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPointSearchBusy(true)
    setError("")

    try {
      const payload = await searchGuidePoints(pointForm.search_query)
      setPointSearchResults(payload.points)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось найти точки.")
    } finally {
      setPointSearchBusy(false)
    }
  }

  const handlePickExistingPoint = (point: GuidePointSearchRecord) => {
    setPointForm((current) => ({
      ...current,
      mode: "existing",
      point_id: String(point.id),
      title: point.title,
      address_text: point.address_text || "",
      coordinates: formatCoordinates(point.lat, point.lng),
      title_override: current.title_override || point.title,
    }))
  }

  const startPointEdit = (point: GuideTourDetail["points"][number]) => {
    const catalogPoint: GuidePointSearchRecord | null = point.point.id
      ? {
          id: point.point.id,
          title: point.point.title || "",
          address_text: point.point.address_text || "",
          lat: point.point.lat,
          lng: point.point.lng,
        }
      : null

    setEditingPointId(point.id)
    setPointSearchResults(catalogPoint ? [catalogPoint] : [])
    setPointForm({
      mode: "existing",
      search_query: "",
      point_id: point.point.id ? String(point.point.id) : "",
      title: point.point.title || "",
      description: point.description_override || "",
      address_text: point.point.address_text || "",
      coordinates: formatCoordinates(point.point.lat, point.point.lng),
      gallery_text: galleryArrayToText(point.gallery_image_urls),
      gallery_caption_text: captionArrayToText(point.gallery_captions),
      sort_order: String(point.sort_order),
      title_override: point.title_override || "",
      description_override: point.description_override || "",
      translation_json: point.translation_json ?? {},
      is_route_visible: point.is_route_visible,
    })
    setEditingTrackId(null)
    setTrackInputKey((current) => current + 1)
    setTrackForm(emptyTrackForm(String(point.id)))
    window.setTimeout(() => pointEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  useEffect(() => {
    const pointId = initialPointIdRef.current

    if (!selectedTour || !pointId) {
      return
    }

    const point = selectedTour.points.find((item) => item.id === pointId)
    initialPointIdRef.current = null

    if (point) {
      setStudioSection("editor")
      startPointEdit(point)
    }
  }, [selectedTour])

  const resetPointForm = () => {
    setEditingPointId(null)
    setPointSearchResults([])
    setPointForm({
      mode: "existing",
      search_query: "",
      point_id: "",
      title: "",
      description: "",
      address_text: "",
      coordinates: "",
      gallery_text: "",
      gallery_caption_text: "",
      sort_order: "",
      title_override: "",
      description_override: "",
      translation_json: {},
      is_route_visible: true,
    })
    setEditingTrackId(null)
    setTrackInputKey((current) => current + 1)
    setPointAudioInputKey((current) => current + 1)
    setPendingPointAudioFile(null)
    setTrackForm(emptyTrackForm())
  }

  const handleCreatePoint = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTourId) {
      setError("Сначала выберите тур.")
      return
    }

    if (imageBusy) {
      setError("Дождитесь окончания загрузки фотографий, затем сохраните точку.")
      return
    }

    if (!pointForm.point_id) {
      setError("Выберите точку из общего справочника. Если нужной точки нет, обратитесь к администратору.")
      return
    }

    setPointBusy(true)
    setMessage("")
    setError("")

    try {
      const response = await createGuidePoint(selectedTourId, {
        point_id: Number(pointForm.point_id),
        sort_order: parseOptionalNumber(pointForm.sort_order),
        title_override: pointForm.title_override || undefined,
        description_override: pointForm.description_override || undefined,
        gallery_json: galleryTextToArray(pointForm.gallery_text),
        gallery_captions_json: captionTextToArray(pointForm.gallery_caption_text),
        translation_json: pointForm.translation_json,
        is_route_visible: pointForm.is_route_visible,
      })

      if (pendingPointAudioFile) {
        await createGuideTrack(selectedTourId, {
          tour_point_id: response.tour_point.id,
          audio_file: pendingPointAudioFile,
          track_type: "main",
          is_demo: false,
          is_published: true,
        })
      }

      setMessage("Точка добавлена в маршрут.")
      resetPointForm()
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось добавить точку.")
    } finally {
      setPointBusy(false)
    }
  }

  const handleUpdatePoint = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTourId || !editingPointId) {
      setError("Сначала выберите точку маршрута.")
      return
    }

    if (imageBusy) {
      setError("Дождитесь окончания загрузки фотографий, затем сохраните точку.")
      return
    }

    const coordinates = parseCoordinates(pointForm.coordinates)

    if (!coordinates) {
      setError("Укажите координаты точки в формате: 52.610923, 29.271421.")
      return
    }

    setPointBusy(true)
    setMessage("")
    setError("")

    try {
      await updateGuidePoint(selectedTourId, editingPointId, {
        title: pointForm.title || null,
        description: pointForm.description || null,
        address_text: pointForm.address_text || null,
        lat: coordinates?.lat ?? null,
        lng: coordinates?.lng ?? null,
        title_override: pointForm.title_override || null,
        description_override: pointForm.description_override || null,
        gallery_json: galleryTextToArray(pointForm.gallery_text),
        gallery_captions_json: captionTextToArray(pointForm.gallery_caption_text),
        translation_json: pointForm.translation_json,
        sort_order: parseOptionalNumber(pointForm.sort_order) ?? null,
        is_route_visible: pointForm.is_route_visible,
      })

      setMessage("Точка маршрута обновлена.")
      resetPointForm()
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить точку.")
    } finally {
      setPointBusy(false)
    }
  }

  const handleDeletePoint = async (tourPointId: number) => {
    if (!selectedTourId) {
      return
    }

    if (!window.confirm("Удалить точку маршрута? Привязанные треки сохранятся без точки.")) {
      return
    }

    setPointBusy(true)
    setMessage("")
    setError("")

    try {
      await deleteGuidePoint(selectedTourId, tourPointId)
      setMessage("Точка маршрута удалена.")
      if (editingPointId === tourPointId) {
        resetPointForm()
      }
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить точку.")
    } finally {
      setPointBusy(false)
    }
  }

  const startTrackEdit = (track: GuideTrackRecord) => {
    setEditingTrackId(track.id)
    setTrackForm({
      tour_point_id: track.tour_point_id ? String(track.tour_point_id) : "",
      manual_point_title: track.tour_point_id ? "" : track.tour_point_title || "",
      description: track.description || "",
      audio_url: "",
      audio_file: null,
      duration_seconds: track.duration_seconds ? String(track.duration_seconds) : "10",
      sort_order: String(track.sort_order),
      track_type: track.track_type || "main",
      is_demo: track.is_demo,
      is_published: track.is_published,
      translation_json: track.translation_json ?? {},
    })
    setTrackInputKey((current) => current + 1)
  }

  const resetTrackForm = () => {
    const currentPointId = editingPointId ? String(editingPointId) : ""

    setEditingTrackId(null)
    setTrackInputKey((current) => current + 1)
    setTrackForm(emptyTrackForm(currentPointId))
  }

  const handleCreateTrack = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTourId) {
      setError("Сначала выберите тур.")
      return
    }

    setTrackBusy(true)
    setMessage("")
    setError("")

    try {
      const resolvedTourPointId = trackForm.tour_point_id || (editingPointId ? String(editingPointId) : "")
      const isPointTrack = Boolean(resolvedTourPointId)

      await createGuideTrack(selectedTourId, {
        tour_point_id: resolvedTourPointId ? Number(resolvedTourPointId) : undefined,
        manual_point_title: resolvedTourPointId ? undefined : trackForm.manual_point_title || undefined,
        description: isPointTrack ? undefined : trackForm.description || undefined,
        audio_url: trackForm.audio_url || undefined,
        audio_file: trackForm.audio_file,
        duration_seconds: isPointTrack ? undefined : parseOptionalNumber(trackForm.duration_seconds),
        sort_order: isPointTrack ? undefined : parseOptionalNumber(trackForm.sort_order),
        track_type: isPointTrack ? "main" : trackForm.track_type,
        is_demo: isPointTrack ? false : trackForm.is_demo,
        is_published: isPointTrack ? true : trackForm.is_published,
        translation_json: trackForm.translation_json,
      })

      setMessage("Трек добавлен в тур.")
      resetTrackForm()
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось добавить трек.")
    } finally {
      setTrackBusy(false)
    }
  }

  const handleUpdateTrack = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTourId || !editingTrackId) {
      setError("Сначала выберите трек.")
      return
    }

    setTrackBusy(true)
    setMessage("")
    setError("")

    try {
      const resolvedTourPointId = trackForm.tour_point_id || (editingPointId ? String(editingPointId) : "")

      await updateGuideTrack(selectedTourId, editingTrackId, {
        tour_point_id: resolvedTourPointId ? Number(resolvedTourPointId) : undefined,
        manual_point_title: resolvedTourPointId ? undefined : trackForm.manual_point_title || "",
        description: trackForm.description || "",
        audio_url: trackForm.audio_url.trim() || undefined,
        audio_file: trackForm.audio_file,
        duration_seconds: parseOptionalNumber(trackForm.duration_seconds),
        sort_order: parseOptionalNumber(trackForm.sort_order),
        track_type: trackForm.track_type,
        is_demo: trackForm.is_demo,
        is_published: trackForm.is_published,
        translation_json: trackForm.translation_json,
      })

      setMessage("Трек обновлён.")
      resetTrackForm()
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить трек.")
    } finally {
      setTrackBusy(false)
    }
  }

  const handleDeleteTrack = async (trackId: number) => {
    if (!selectedTourId) {
      return
    }

    if (!window.confirm("Удалить трек?")) {
      return
    }

    setTrackBusy(true)
    setMessage("")
    setError("")

    try {
      await deleteGuideTrack(selectedTourId, trackId)
      setMessage("Трек удалён.")
      resetTrackForm()
      await refresh()
      await refreshSelectedTour(selectedTourId)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить трек.")
    } finally {
      setTrackBusy(false)
    }
  }

  const handleExportGuideSales = () => {
    downloadCsv(
      `audio42_guide_sales_${reportFilters.date_from}_${reportFilters.date_to}.csv`,
      ["Дата оплаты", "Заказ", "Тур", "Прайс", "Скидка", "Фактически получено"],
      salesRows.map((row) => [
        formatDateTime(row.paid_at),
        row.order_number || "—",
        row.tour_title || "Тур",
        row.unit_price_rub,
        row.discount_rub,
        row.final_price_rub,
      ]),
    )
  }

  const handleExportGuideSettlements = () => {
    if (!settlements) {
      return
    }

    downloadCsv(
      `audio42_guide_statement_${settlements.period.from}_${settlements.period.to}.csv`,
      ["Период", "Продажи", "Вознаграждение %", "Вознаграждение", "Выплаты", "Баланс", "Порог достигнут"],
      [[
        `${settlements.period.from} — ${settlements.period.to}`,
        settlements.statement.sales_rub,
        settlements.statement.reward_percent,
        settlements.statement.reward_rub,
        settlements.statement.payouts_rub,
        settlements.statement.balance_rub,
        settlements.statement.eligible_for_withdrawal ? "Да" : "Нет",
      ]],
    )
  }

  const handlePrintGuideSales = () => {
    printTableReport({
      title: "Audio42 — продажи экскурсовода",
      subtitle: `Период: ${reportFilters.date_from} — ${reportFilters.date_to}`,
      headers: ["Дата оплаты", "Заказ", "Тур", "Прайс", "Скидка", "Фактически получено"],
      rows: salesRows.map((row) => [
        formatDateTime(row.paid_at),
        row.order_number || "—",
        row.tour_title || "Тур",
        formatRub(row.unit_price_rub),
        formatRub(row.discount_rub),
        formatRub(row.final_price_rub),
      ]),
    })
  }

  const handlePrintGuideSettlements = () => {
    if (!settlements) {
      return
    }

    printTableReport({
      title: "Audio42 — ведомость экскурсовода",
      subtitle: `Период: ${settlements.period.from} — ${settlements.period.to}`,
      headers: ["Продажи", "Вознаграждение %", "Вознаграждение", "Выплаты", "Баланс", "Порог достигнут"],
      rows: [[
        formatRub(settlements.statement.sales_rub),
        `${settlements.statement.reward_percent}%`,
        formatRub(settlements.statement.reward_rub),
        formatRub(settlements.statement.payouts_rub),
        formatRub(settlements.statement.balance_rub),
        settlements.statement.eligible_for_withdrawal ? "Да" : "Нет",
      ]],
    })
  }

  const myToursPanel = (
    <article className="panel checkout-info">
      <h3>Мои туры</h3>
      <div className="stack-list">
        {tours.map((tour) => (
          <div
            key={tour.id}
            className={`stack-card ${selectedTourId === tour.id ? "stack-card-active" : ""}`}
          >
            <strong>{tour.title}</strong>
            <p>{tour.short_description || "Описание будет добавлено позже."}</p>
            <p>
              {formatRub(tour.price_rub)} · {tourStatusLabel(tour.status)} · точек: {tour.tour_points_count} · треков: {tour.tracks_count}
            </p>
            <div className="stack-actions">
              <button
                type="button"
                className="mini-button"
                onClick={() => handleOpenTourEditor(tour.id)}
              >
                Открыть редактор
              </button>
              <button
                type="button"
                className="mini-button mini-button-danger"
                disabled={busy}
                onClick={() => void handleDeleteTour(tour.id)}
              >
                Удалить
              </button>
              {tour.status === "published" ? (
                <a
                  href={`${PUBLIC_SITE_ORIGIN}/excursions/${tour.slug}`}
                  className="mini-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть публичную страницу
                </a>
              ) : (
                <span className="mini-link" aria-disabled="true">
                  Публичная страница появится после публикации
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
  const selectedCatalogPoint = pointSearchResults.find((point) => String(point.id) === pointForm.point_id) ?? null
  const guidePointMapPoints = useMemo(() => pointPickerMapPoints(pointSearchResults), [pointSearchResults])
  const editingPointTracks = useMemo(() => {
    if (!selectedTour || !editingPointId) {
      return []
    }

    return selectedTour.tracks.filter((track) => track.tour_point_id === editingPointId)
  }, [selectedTour, editingPointId])
  const pointGalleryItems = useMemo(() => {
    const images = galleryTextToArray(pointForm.gallery_text)
    const captions = captionTextToArray(pointForm.gallery_caption_text)

    return images.map((imageUrl, index) => ({
      imageUrl,
      caption: captions[index] ?? "",
    }))
  }, [pointForm.gallery_text, pointForm.gallery_caption_text])

  const updatePointGalleryCaption = (index: number, caption: string) => {
    setPointForm((current) => {
      const images = galleryTextToArray(current.gallery_text)
      const captions = captionTextToArray(current.gallery_caption_text)
      const nextCaptions = images.map((_, itemIndex) => (itemIndex === index ? caption : captions[itemIndex] ?? ""))

      return {
        ...current,
        gallery_caption_text: nextCaptions.join("\n"),
      }
    })
  }

  const removePointGalleryImage = (index: number) => {
    setPointForm((current) => {
      const images = galleryTextToArray(current.gallery_text)
      const captions = captionTextToArray(current.gallery_caption_text)

      return {
        ...current,
        gallery_text: images.filter((_, itemIndex) => itemIndex !== index).join("\n"),
        gallery_caption_text: images
          .map((_, itemIndex) => captions[itemIndex] ?? "")
          .filter((_, itemIndex) => itemIndex !== index)
          .join("\n"),
      }
    })
  }

  return (
    <BackofficeGate title="Студия экскурсовода" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Экскурсовод</p>
          <h1>Студия маршрутов</h1>
          <p className="lede">Загрузка туров, своя динамика продаж и подготовка маршрутов с точками и треками.</p>
        </section>

        {summary ? (
          <section className="stats-grid">
            <article className="stat-tile sales">
              <span>Продажи</span>
              <strong>{formatRub(summary.summary.sales_rub)}</strong>
              <em>по вашим турам</em>
            </article>
            <article className="stat-tile views">
              <span>Вознаграждение</span>
              <strong>{formatRub(summary.summary.reward_rub)}</strong>
              <em>{summary.summary.reward_percent}% от продаж</em>
            </article>
            <article className="stat-tile guides">
              <span>Туры</span>
              <strong>{summary.summary.tours_count}</strong>
              <em>в вашем кабинете</em>
            </article>
            <article className="stat-tile access">
              <span>Порог вывода</span>
              <strong>{summary.summary.eligible_for_withdrawal ? "Достигнут" : "Менее 10 000 ₽"}</strong>
              <em>по фактическому вознаграждению</em>
            </article>
          </section>
        ) : null}

        <section className="studio-tabs" aria-label="Разделы студии">
          {([
            ["tours", "Туры"],
            ["editor", "Редактор"],
            ["reports", "Отчёты"],
          ] as Array<[StudioSection, string]>).map(([section, label]) => (
            <button
              key={section}
              type="button"
              className={`mini-button ${studioSection === section ? "mini-button-active" : ""}`}
              onClick={() => setStudioSection(section)}
            >
              {label}
            </button>
          ))}
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        {studioSection === "tours" ? (
          <section className="checkout-grid">
            {myToursPanel}
          </section>
        ) : null}

        {studioSection === "reports" ? (
        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>Отчёты экскурсовода</h3>
            <form className="checkout-form" onSubmit={handleApplyReportFilters}>
              <div className="filter-presets">
                {(["this_month", "last_month", "this_quarter", "last_quarter"] as ReportPresetKey[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="mini-button"
                    disabled={reportBusy}
                    onClick={() => void handleReportPreset(preset)}
                  >
                    {presetLabel(preset)}
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Тур</span>
                <select
                  className="field-select"
                  value={reportFilters.tour_id}
                  onChange={(event) => setReportFilters((current) => ({ ...current, tour_id: event.target.value }))}
                >
                  <option value="">Все мои туры</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Дата с</span>
                <input
                  type="date"
                  value={reportFilters.date_from}
                  onChange={(event) => setReportFilters((current) => ({ ...current, date_from: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Дата по</span>
                <input
                  type="date"
                  value={reportFilters.date_to}
                  onChange={(event) => setReportFilters((current) => ({ ...current, date_to: event.target.value }))}
                />
              </label>
              <button type="submit" className="button button-primary wide-button" disabled={reportBusy}>
                {reportBusy ? "Обновляем..." : "Обновить отчёты"}
              </button>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Сводка расчётов</h3>
            {settlements ? (
              <div className="stack-list">
                <div className="stack-card">
                  <strong>Период</strong>
                  <p>{settlements.period.from} — {settlements.period.to}</p>
                </div>
                <div className="stack-card">
                  <strong>Продажи</strong>
                  <p>{formatRub(settlements.statement.sales_rub)}</p>
                </div>
                <div className="stack-card">
                  <strong>Вознаграждение</strong>
                  <p>{formatRub(settlements.statement.reward_rub)} · {settlements.statement.reward_percent}%</p>
                </div>
                <div className="stack-card">
                  <strong>Баланс</strong>
                  <p>
                    {formatRub(settlements.statement.balance_rub)} ·{" "}
                    {settlements.statement.eligible_for_withdrawal ? "порог 10 000 ₽ достигнут" : "порог 10 000 ₽ пока не достигнут"}
                  </p>
                </div>
              </div>
            ) : (
              <p>Загружаем расчёты экскурсовода…</p>
            )}
          </article>
        </section>
        ) : null}

        {studioSection === "tours" ? (
        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>Создать новый тур</h3>
            <form className="checkout-form" onSubmit={handleCreate}>
              <label className="field">
                <span>Название</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </label>
              <label className="field">
                <span>Цена</span>
                <input value={form.price_rub} onChange={(event) => setForm({ ...form, price_rub: event.target.value })} required />
              </label>
              <label className="field">
                <span>Краткое описание</span>
                <textarea className="field-textarea" value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} />
              </label>
              <label className="field">
                <span>Подробное описание</span>
                <textarea className="field-textarea" value={form.full_description} onChange={(event) => setForm({ ...form, full_description: event.target.value })} />
              </label>
              <label className="field">
                <span>Для кого</span>
                <textarea className="field-textarea" value={form.audience_description} onChange={(event) => setForm({ ...form, audience_description: event.target.value })} />
              </label>
              <label className="field">
                <span>Длительность в минутах</span>
                <input value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} />
              </label>
              <p className="form-hint">После создания сразу откроется редактор: там можно загрузить обложку, добавить остановки, фотографии и аудиотреки.</p>
              {message ? <p className="form-success">{message}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy ? "Создаём..." : "Создать тур"}
              </button>
            </form>
          </article>

        </section>
        ) : null}

        {studioSection === "editor" ? (
        <>
        <section className="panel page-intro" ref={editorRef}>
          <p className="eyebrow">Редактор тура</p>
          <h2>{selectedTour ? selectedTour.title : "Выберите тур из списка выше"}</h2>
          <p className="lede">
            Здесь экскурсовод может править карточку тура, собирать маршрут из точек и загружать аудиотреки по требованиям платформы.
          </p>
        </section>

        {detailLoading ? (
          <section className="panel empty-state">Загружаем детали тура и маршрут…</section>
        ) : selectedTour ? (
          <>
            <section className="checkout-grid">
              <article className="panel checkout-form-card">
                <h3>Карточка тура</h3>
                <form className="checkout-form" onSubmit={handleSaveTour}>
                  <label className="field">
                    <span>Название</span>
                    <input
                      value={tourEditor.title}
                      onChange={(event) => setTourEditor((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Цена</span>
                    <input
                      value={tourEditor.price_rub}
                      onChange={(event) => setTourEditor((current) => ({ ...current, price_rub: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Краткое описание</span>
                    <textarea
                      className="field-textarea"
                      value={tourEditor.short_description}
                      onChange={(event) => setTourEditor((current) => ({ ...current, short_description: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Подробное описание</span>
                    <textarea
                      className="field-textarea"
                      value={tourEditor.full_description}
                      onChange={(event) => setTourEditor((current) => ({ ...current, full_description: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Для кого</span>
                    <textarea
                      className="field-textarea"
                      value={tourEditor.audience_description}
                      onChange={(event) => setTourEditor((current) => ({ ...current, audience_description: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Длительность в минутах</span>
                    <input
                      value={tourEditor.duration_minutes}
                      onChange={(event) => setTourEditor((current) => ({ ...current, duration_minutes: event.target.value }))}
                    />
                  </label>
                  <div className="field">
                    <span>Обложка тура</span>
                    {tourEditor.cover_image_url ? (
                      <div
                        className={`cover-upload-card cover-drop-zone${coverDragActive ? " cover-drop-zone-active" : ""}`}
                        onDragEnter={handleCoverDrag}
                        onDragOver={handleCoverDrag}
                        onDragLeave={handleCoverDrag}
                        onDrop={handleCoverDrop}
                        aria-busy={imageBusy}
                      >
                        {imagePreviewUrl(tourEditor.cover_image_url) ? (
                          <img
                            src={imagePreviewUrl(tourEditor.cover_image_url) || undefined}
                            alt="Загруженная обложка тура"
                            className="cover-upload-preview"
                          />
                        ) : null}
                        <div className="cover-upload-body">
                          <strong>Обложка загружена</strong>
                          <p>{displayUploadName(tourEditor.cover_image_url, coverFileName)}</p>
                          <small>Чтобы заменить картинку, перетащите новый файл в этот блок или нажмите «Заменить».</small>
                          <div className="stack-actions">
                            <label className="mini-button file-action-button">
                              Заменить
                              <input
                                ref={coverInputRef}
                                className="visually-hidden-file"
                                type="file"
                                accept="image/*"
                                disabled={imageBusy}
                                onChange={(event) => void handleUploadCover(event.target.files?.[0] ?? null)}
                              />
                            </label>
                            <button type="button" className="mini-button mini-button-danger" onClick={handleClearCover} disabled={imageBusy}>
                              Убрать
                            </button>
                          </div>
                          <small>{imageBusy ? "Загружаем изображение..." : "JPG, PNG или WebP до 8 МБ."}</small>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`cover-upload-card cover-drop-zone cover-upload-empty${coverDragActive ? " cover-drop-zone-active" : ""}`}
                        onDragEnter={handleCoverDrag}
                        onDragOver={handleCoverDrag}
                        onDragLeave={handleCoverDrag}
                        onDrop={handleCoverDrop}
                        aria-busy={imageBusy}
                      >
                        <div className="cover-upload-body">
                          <strong>Перетащите обложку сюда</strong>
                          <p>Или выберите файл кнопкой ниже. После загрузки обложка сразу появится в предпросмотре.</p>
                        </div>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          disabled={imageBusy}
                          onChange={(event) => void handleUploadCover(event.target.files?.[0] ?? null)}
                        />
                        <small>{imageBusy ? "Загружаем изображение..." : "JPG, PNG или WebP до 8 МБ."}</small>
                      </div>
                    )}
                  </div>
                  <label className="field">
                    <span>Статус</span>
                    <select
                      className="field-select"
                      value={tourEditor.status}
                      onChange={(event) =>
                        setTourEditor((current) => ({
                          ...current,
                          status: event.target.value as "draft" | "published" | "archived",
                        }))
                      }
                    >
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликован</option>
                      <option value="archived">Архив</option>
                    </select>
                  </label>
                  <button type="submit" className="button button-primary wide-button" disabled={editorBusy}>
                    {editorBusy ? "Сохраняем..." : "Сохранить тур"}
                  </button>
                </form>
              </article>

              <article className="panel checkout-info">
                <h3>Текущее состояние</h3>
                <div className="stack-list">
                  <div className="stack-card">
                    <strong>{selectedTour.title}</strong>
                    <p>{selectedTour.slug}</p>
                    <p>{formatRub(selectedTour.price_rub)} · {tourStatusLabel(selectedTour.status)}</p>
                    <p>Точек: {selectedTour.points.length} · Треков: {selectedTour.tracks.length}</p>
                  </div>
                  {selectedTour.cover_image_url ? (
                    <div className="stack-card cover-summary-card">
                      <strong>Обложка</strong>
                      {imagePreviewUrl(selectedTour.cover_image_url) ? (
                        <img
                          src={imagePreviewUrl(selectedTour.cover_image_url) || undefined}
                          alt="Текущая обложка тура"
                          className="cover-summary-preview"
                        />
                      ) : null}
                      <p>{displayUploadName(selectedTour.cover_image_url)}</p>
                    </div>
                  ) : null}
                  <div className="stack-card">
                    <strong>Публичная страница</strong>
                    {selectedTour.status === "published" ? (
                      <a
                        href={`${PUBLIC_SITE_ORIGIN}/excursions/${selectedTour.slug}`}
                        className="mini-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть тур на сайте
                      </a>
                    ) : (
                      <span className="mini-link" aria-disabled="true">
                        Появится после публикации тура
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </section>

            <section className="route-point-editor-grid">
              <article className="panel checkout-form-card" ref={pointEditorRef} data-editing-point={editingPointId ? "true" : "false"}>
                <h3>{editingPointId ? "Редактировать точку маршрута" : "Добавить точку маршрута"}</h3>
                <form className="checkout-form" onSubmit={editingPointId ? handleUpdatePoint : handlePointSearch}>
                  {editingPointId ? (
                    <div className="point-linked-summary">
                      <div className="stack-card selected-point-card">
                        <strong>{selectedCatalogPoint ? selectedCatalogPoint.title : pointForm.title || "Привязанная точка"}</strong>
                        <p>{selectedCatalogPoint?.address_text || pointForm.address_text || "Адрес не указан"}</p>
                        {pointForm.coordinates ? <p>{pointForm.coordinates}</p> : null}
                      </div>
                      <YandexMap
                        points={guidePointMapPoints}
                        selectedPointId={pointForm.point_id ? Number(pointForm.point_id) : null}
                        className="point-picker-map-surface point-picker-map-surface-compact"
                        emptyMessage="Координаты точки не указаны."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="stack-card">
                        <strong>Выбор из справочника</strong>
                        <p>Новые точки создает администратор. Если нужной точки нет, передайте ее Сергею или администратору как заявку на добавление.</p>
                      </div>

                      <label className="field">
                        <span>Поиск точки</span>
                        <input
                          value={pointForm.search_query}
                          onChange={(event) => setPointForm((current) => ({ ...current, search_query: event.target.value }))}
                          placeholder="Например, Площадь Советов"
                        />
                      </label>
                      <button type="submit" className="button button-secondary" disabled={pointSearchBusy}>
                        {pointSearchBusy ? "Ищем..." : "Найти точки"}
                      </button>
                      <div className="point-map-picker">
                        <YandexMap
                          points={guidePointMapPoints}
                          selectedPointId={pointForm.point_id ? Number(pointForm.point_id) : null}
                          className="point-picker-map-surface"
                          emptyMessage="Нет точек для показа на карте. Измените поиск или добавьте точку через админа."
                          onPointClick={(point) => {
                            const record = pointSearchResults.find((candidate) => candidate.id === point.pointId)
                            if (record) {
                              handlePickExistingPoint(record)
                            }
                          }}
                        />
                      </div>
                      <div className="stack-card selected-point-card">
                        <strong>{selectedCatalogPoint ? selectedCatalogPoint.title : "Точка не выбрана"}</strong>
                        <p>{selectedCatalogPoint?.address_text || "Выберите маркер на карте или найдите точку по названию."}</p>
                        {selectedCatalogPoint ? <p>{formatCoordinates(selectedCatalogPoint.lat, selectedCatalogPoint.lng)}</p> : null}
                      </div>
                      <label className="field">
                        <span>Аудиотрек к этой точке</span>
                        <input
                          key={pointAudioInputKey}
                          type="file"
                          accept="audio/*"
                          onChange={(event) => setPendingPointAudioFile(event.target.files?.[0] ?? null)}
                        />
                        <small>{pendingPointAudioFile ? `Выбран файл: ${pendingPointAudioFile.name}` : "Можно сразу загрузить MP3, WAV, OGG, MP4 или AAC. Трек привяжется к точке после добавления."}</small>
                      </label>
                      {pointSearchResults.length > 0 ? (
                        <div className="stack-list point-picker-list-fallback">
                          {pointSearchResults.map((point) => (
                            <button
                              key={point.id}
                              type="button"
                              className={`stack-card stack-card-button ${pointForm.point_id === String(point.id) ? "stack-card-active" : ""}`}
                              onClick={() => handlePickExistingPoint(point)}
                            >
                              <strong>{point.title}</strong>
                              <p>{point.address_text || "Адрес не указан"}</p>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}

                  <label className="field">
                    <span>Координаты выбранной точки</span>
                    <input
                      value={pointForm.coordinates}
                      readOnly
                      placeholder="52.610923, 29.271421"
                    />
                    <small>Координаты редактируются администратором в справочнике точек.</small>
                  </label>

                  <label className="field">
                    <span>Название остановки в этой экскурсии</span>
                    <input
                      value={pointForm.title_override}
                      onChange={(event) => setPointForm((current) => ({ ...current, title_override: event.target.value }))}
                      placeholder="Если оставить пустым, будет показано название точки из справочника."
                    />
                  </label>
                  <label className="field">
                    <span>Описание в маршруте</span>
                    <textarea
                      className="field-textarea"
                      value={pointForm.description_override}
                      onChange={(event) => setPointForm((current) => ({ ...current, description_override: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Фотографии остановки</span>
                    <input
                      ref={pointGalleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => void handleUploadPointGallery(event.target.files)}
                    />
                    <small>{imageBusy ? "Загружаем фотографии..." : "Можно выбрать несколько файлов JPG, PNG или WebP."}</small>
                  </label>
                  <div className="point-gallery-editor">
                    <div className="point-gallery-editor-head">
                      <strong>Галерея остановки</strong>
                      <span>{pointGalleryItems.length} фото</span>
                    </div>
                    {pointGalleryItems.length > 0 ? (
                      <div className="point-gallery-editor-grid">
                        {pointGalleryItems.map((item, index) => (
                          <figure key={`${item.imageUrl}-${index}`} className="point-gallery-editor-card">
                            {imagePreviewUrl(item.imageUrl) ? (
                              <img src={imagePreviewUrl(item.imageUrl) || undefined} alt={`Фото остановки ${index + 1}`} />
                            ) : (
                              <div className="point-gallery-editor-missing">Превью недоступно</div>
                            )}
                            <figcaption>
                              <strong>Фото {index + 1}</strong>
                              <span>{displayUploadName(item.imageUrl, "")}</span>
                              <label className="field">
                                <span>Подпись</span>
                                <textarea
                                  className="field-textarea"
                                  value={item.caption}
                                  maxLength={100}
                                  onChange={(event) => updatePointGalleryCaption(index, event.target.value)}
                                  placeholder="Подпись к фото на публичной странице"
                                />
                              </label>
                              <button
                                type="button"
                                className="mini-button mini-button-danger"
                                onClick={() => removePointGalleryImage(index)}
                              >
                                Удалить фото
                              </button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <div className="stack-card">
                        <strong>Фото пока не добавлены</strong>
                        <p>Загрузите фотографии остановки: они будут видны здесь карточками с подписями.</p>
                      </div>
                    )}
                  </div>
                  {editingPointId ? (
                    <div className="point-audio-editor">
                      <div className="point-gallery-editor-head">
                        <strong>Аудио этой остановки</strong>
                        <span>{editingPointTracks.length} аудиотреков</span>
                      </div>
                      <div className="stack-list">
                        {editingPointTracks.length > 0 ? (
                          editingPointTracks.map((track) => (
                            <div key={track.id} className={`stack-card ${editingTrackId === track.id ? "stack-card-active" : ""}`}>
                              <strong>{audioFileTitle(track)}</strong>
                              <p>{track.title}</p>
                              <p>
                                {track.is_published ? "Опубликован" : "Черновик"}
                              </p>
                              <p>{audioFileLabel(track)}</p>
                              <div className="stack-actions">
                                <button type="button" className="mini-button mini-button-danger" onClick={() => void handleDeleteTrack(track.id)}>
                                  Удалить аудио
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="stack-card">
                            <strong>Аудио пока не добавлено</strong>
                            <p>Загрузите аудиотрек здесь: он будет привязан именно к этой остановке.</p>
                          </div>
                        )}
                      </div>
                      <div className="stack-card point-audio-form">
                        <strong>Загрузить аудиотрек к этой остановке</strong>
                        <label className="field">
                          <span>Аудиофайл</span>
                          <input
                            key={trackInputKey}
                            type="file"
                            accept="audio/*"
                            onChange={(event) =>
                              setTrackForm((current) => ({
                                ...current,
                                tour_point_id: String(editingPointId),
                                audio_file: event.target.files?.[0] ?? null,
                              }))
                            }
                          />
                          <small>{trackForm.audio_file ? `Выбран файл: ${trackForm.audio_file.name}` : "MP3, WAV, OGG, MP4 или AAC."}</small>
                        </label>
                        <div className="stack-actions">
                          <button
                            type="button"
                            className="button button-primary wide-button"
                            disabled={trackBusy}
                            onClick={() => {
                              void handleCreateTrack({ preventDefault() {} } as React.FormEvent<HTMLFormElement>)
                            }}
                          >
                            {trackBusy ? "Загружаем аудио..." : "Загрузить аудио"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <label className="field">
                    <span>Порядок в маршруте</span>
                    <input
                      value={pointForm.sort_order}
                      onChange={(event) => setPointForm((current) => ({ ...current, sort_order: event.target.value }))}
                      placeholder="Если пусто, добавим в конец"
                    />
                  </label>
                  <label className="consent-item">
                    <input
                      type="checkbox"
                      checked={pointForm.is_route_visible}
                      onChange={(event) => setPointForm((current) => ({ ...current, is_route_visible: event.target.checked }))}
                    />
                    <span>Показывать точку в маршруте</span>
                  </label>
                  <div className="stack-actions">
                    {editingPointId ? (
                      <>
                        <button type="submit" className="button button-primary wide-button" disabled={pointBusy || imageBusy}>
                          {pointBusy ? "Сохраняем точку..." : "Сохранить точку"}
                        </button>
                        <button type="button" className="button button-secondary wide-button" onClick={resetPointForm} disabled={pointBusy}>
                          Отменить
                        </button>
                      </>
                    ) : (
                      <button type="button" className="button button-primary wide-button" onClick={() => void handleCreatePoint({ preventDefault() {} } as React.FormEvent<HTMLFormElement>)} disabled={pointBusy || imageBusy}>
                        {pointBusy ? "Добавляем точку..." : "Добавить точку"}
                      </button>
                    )}
                  </div>
                </form>
              </article>

              <article className="panel checkout-info">
                <h3>Точки в текущем туре</h3>
                <div className="stack-list">
                  {selectedTour.points.length > 0 ? (
                    selectedTour.points.map((point) => {
                      const pointTracks = selectedTour.tracks.filter((track) => track.tour_point_id === point.id)
                      const pointImage = point.gallery_items[0]?.image_url || point.gallery_image_urls[0] || ""

                      return (
                      <div key={point.id} className={`stack-card route-point-summary-card ${editingPointId === point.id ? "stack-card-active" : ""}`}>
                        {pointImage ? (
                          <img className="route-point-summary-image" src={imagePreviewUrl(pointImage) || pointImage} alt="" />
                        ) : null}
                        <span className="route-point-summary-number">#{point.sort_order}</span>
                        <strong>{point.title_override || point.point.title || "Точка маршрута"}</strong>
                        <p>{point.point.address_text || "Адрес не указан"}</p>
                        {point.gallery_image_urls.length > 0 ? (
                          <p>Фото остановки: {point.gallery_image_urls.length}</p>
                        ) : null}
                        {point.gallery_captions.filter((item) => item.trim()).length > 0 ? (
                          <p>Подписей: {point.gallery_captions.filter((item) => item.trim()).length}</p>
                        ) : null}
                        <p>{pointTracks.length > 0 ? `Аудиофайл: ${pointTracks[0].audio_file_name || "загружен"}` : "Аудиофайла нет"}</p>
                        <p>{point.is_route_visible ? "Видна на карте" : "Скрыта из маршрута"}</p>
                        <div className="stack-actions">
                          <button type="button" className="mini-button" onClick={() => startPointEdit(point)}>
                            Редактировать
                          </button>
                          <button type="button" className="mini-button mini-button-danger" onClick={() => void handleDeletePoint(point.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                      )
                    })
                  ) : (
                    <div className="stack-card">
                      <strong>Пока нет точек</strong>
                      <p>Добавьте первую точку маршрута справа через поиск по общему справочнику.</p>
                    </div>
                  )}
                </div>
              </article>
            </section>

            {!editingPointId ? (
              <section className="checkout-grid">
                <article className="panel checkout-form-card">
                  <h3>{editingTrackId ? "Редактировать аудиотрек" : "Добавить аудиотрек"}</h3>
                  <form className="checkout-form" onSubmit={editingTrackId ? handleUpdateTrack : handleCreateTrack}>
                  <label className="field">
                    <span>Привязка к точке</span>
                    <select
                      className="field-select"
                      value={trackForm.tour_point_id}
                      onChange={(event) => setTrackForm((current) => ({ ...current, tour_point_id: event.target.value }))}
                    >
                      <option value="">Без привязки к точке</option>
                      {selectedTour.points.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.title_override || point.point.title || "Точка"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!trackForm.tour_point_id ? (
                    <label className="field">
                      <span>Ручное название точки для трека</span>
                      <input
                        value={trackForm.manual_point_title}
                        onChange={(event) => setTrackForm((current) => ({ ...current, manual_point_title: event.target.value }))}
                        placeholder="Например, О том, как рос город-сад Кемерово"
                      />
                    </label>
                  ) : null}
                  <label className="field">
                    <span>Описание трека</span>
                    <textarea
                      className="field-textarea"
                      value={trackForm.description}
                      onChange={(event) => setTrackForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Аудиофайл</span>
                    <input
                      key={trackInputKey}
                      type="file"
                      accept="audio/*"
                      onChange={(event) =>
                        setTrackForm((current) => ({
                          ...current,
                          audio_file: event.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    <small>{trackForm.audio_file ? `Выбран файл: ${trackForm.audio_file.name}` : "MP3, WAV, OGG, MP4 или AAC."}</small>
                  </label>
                  <BetaDetails
                    title="Ссылка на аудио вместо файла"
                    description="Обычный сценарий - загрузить аудиофайл. Прямая ссылка нужна только для технического переноса старых материалов."
                  >
                    <label className="field">
                      <span>Прямая ссылка на аудио</span>
                      <input
                        value={trackForm.audio_url}
                        onChange={(event) => setTrackForm((current) => ({ ...current, audio_url: event.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                  </BetaDetails>
                  <div className="inline-field">
                    <label className="field">
                      <span>Длительность, сек</span>
                      <input
                        value={trackForm.duration_seconds}
                        onChange={(event) => setTrackForm((current) => ({ ...current, duration_seconds: event.target.value }))}
                      />
                    </label>
                    <label className="field">
                      <span>Порядок</span>
                      <input
                        value={trackForm.sort_order}
                        onChange={(event) => setTrackForm((current) => ({ ...current, sort_order: event.target.value }))}
                        placeholder="Если пусто, добавим в конец"
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Тип трека</span>
                    <select
                      className="field-select"
                      value={trackForm.track_type}
                      onChange={(event) =>
                        setTrackForm((current) => ({ ...current, track_type: event.target.value as "main" | "bonus" }))
                      }
                    >
                      <option value="main">Основной маршрут</option>
                      <option value="bonus">Бонусный трек</option>
                    </select>
                  </label>
                  <label className="consent-item">
                    <input
                      type="checkbox"
                      checked={trackForm.is_demo}
                      onChange={(event) => setTrackForm((current) => ({ ...current, is_demo: event.target.checked }))}
                    />
                    <span>Сделать демо-треком</span>
                  </label>
                  <label className="consent-item">
                    <input
                      type="checkbox"
                      checked={trackForm.is_published}
                      onChange={(event) => setTrackForm((current) => ({ ...current, is_published: event.target.checked }))}
                    />
                    <span>Сразу опубликовать трек</span>
                  </label>
                  <div className="stack-actions">
                    <button type="submit" className="button button-primary wide-button" disabled={trackBusy}>
                      {trackBusy ? (editingTrackId ? "Сохраняем трек..." : "Загружаем трек...") : (editingTrackId ? "Сохранить трек" : "Добавить трек")}
                    </button>
                    {editingTrackId ? (
                      <button type="button" className="button button-secondary wide-button" onClick={resetTrackForm} disabled={trackBusy}>
                        Отменить
                      </button>
                    ) : null}
                  </div>
                </form>
              </article>

              <article className="panel checkout-info">
                <h3>Треки тура</h3>
                <div className="stack-list">
                  {selectedTour.tracks.length > 0 ? (
                    selectedTour.tracks.map((track) => (
                      <div key={track.id} className="stack-card">
                        <strong>{track.sort_order}. {track.title}</strong>
                        <p>{track.description || "Описание пока не заполнено."}</p>
                        <p>
                          {track.track_type === "bonus" ? "Бонусный" : "Маршрут"} · {track.is_demo ? "Демо" : "Платный"} · {track.is_published ? "Опубликован" : "Черновик"} ·{" "}
                          {track.tour_point_title || "Без точки"}
                        </p>
                        <p>{audioFileLabel(track)}</p>
                        <div className="stack-actions">
                          <button type="button" className="mini-button" onClick={() => startTrackEdit(track)}>
                            Редактировать
                          </button>
                          <button type="button" className="mini-button mini-button-danger" onClick={() => void handleDeleteTrack(track.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="stack-card">
                      <strong>Пока нет треков</strong>
                      <p>Добавьте первый аудиотрек справа. Можно привязать его к точке или оставить без точки.</p>
                    </div>
                  )}
                </div>
                </article>
              </section>
            ) : null}

          </>
        ) : (
          <section className="panel empty-state">Создайте первый тур или выберите существующий для редактирования.</section>
        )}
        </>
        ) : null}
      </div>
    </BackofficeGate>
  )
}

export function AdminPointsPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [points, setPoints] = useState<AdminPointRecord[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [editingPointId, setEditingPointId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "Кемерово",
    address_text: "",
    coordinates: "",
    is_active: true,
  })

  const refreshPoints = async (nextQuery = query) => {
    const payload = await loadAdminPoints(nextQuery)
    setPoints(payload?.points ?? [])
  }

  useEffect(() => {
    if (hasRole) {
      void refreshPoints().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить точки.")
      })
    }
  }, [hasRole])

  const resetForm = () => {
    setEditingPointId(null)
    setForm({
      title: "",
      description: "",
      city: "Кемерово",
      address_text: "",
      coordinates: "",
      is_active: true,
    })
  }

  const startEditPoint = (point: AdminPointRecord) => {
    setEditingPointId(point.id)
    setForm({
      title: point.title,
      description: point.description || "",
      city: point.city || "Кемерово",
      address_text: point.address_text || "",
      coordinates: formatCoordinates(point.lat, point.lng),
      is_active: point.is_active,
    })
  }

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      await refreshPoints(query)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось найти точки.")
    } finally {
      setBusy(false)
    }
  }

  const handleSavePoint = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const coordinates = parseCoordinates(form.coordinates)

    if (!coordinates || coordinates.lat == null || coordinates.lng == null) {
      setError("Введите координаты в формате: 52.610923, 29.271421.")
      return
    }

    setBusy(true)
    setError("")
    setMessage("")

    const payload = {
      title: form.title,
      description: form.description || null,
      city: form.city || "Кемерово",
      address_text: form.address_text || null,
      lat: coordinates.lat,
      lng: coordinates.lng,
      is_active: form.is_active,
    }

    try {
      if (editingPointId) {
        await updateAdminPoint(editingPointId, payload)
        setMessage("Точка обновлена.")
      } else {
        await createAdminPoint(payload)
        setMessage("Точка создана.")
      }

      resetForm()
      await refreshPoints(query)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить точку.")
    } finally {
      setBusy(false)
    }
  }

  const handleDeletePoint = async (point: AdminPointRecord) => {
    if (!window.confirm(`Удалить точку "${point.title}"? Если она уже используется в маршрутах, система только скроет ее из выбора.`)) {
      return
    }

    setBusy(true)
    setError("")
    setMessage("")

    try {
      const response = await deleteAdminPoint(point.id)
      setMessage(response?.message ?? "Точка удалена.")
      if (editingPointId === point.id) {
        resetForm()
      }
      await refreshPoints(query)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить точку.")
    } finally {
      setBusy(false)
    }
  }

  const adminPointMapPoints = useMemo(() => pointPickerMapPoints(points), [points])
  const selectedAdminPoint = editingPointId ? points.find((point) => point.id === editingPointId) ?? null : null

  return (
    <BackofficeGate title="Точки маршрутов" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Точки маршрутов</h1>
          <p className="lede">
            Общий справочник мест. Экскурсоводы выбирают эти точки в студии, а создание, правка и удаление остаются у администратора.
          </p>
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="panel point-map-admin-panel">
          <div className="module-head">
            <div>
              <h3>Карта справочника</h3>
              <p>Кликните по маркеру, чтобы открыть точку в форме редактирования.</p>
            </div>
            <span className="module-tag">{points.length} точек</span>
          </div>
          <YandexMap
            points={adminPointMapPoints}
            selectedPointId={editingPointId}
            className="point-picker-map-surface"
            emptyMessage="Точек для показа на карте пока нет."
            onPointClick={(point) => {
              const record = points.find((candidate) => candidate.id === point.pointId)
              if (record) {
                startEditPoint(record)
              }
            }}
          />
          {selectedAdminPoint ? (
            <div className="stack-card selected-point-card">
              <strong>{selectedAdminPoint.title}</strong>
              <p>{selectedAdminPoint.address_text || "Адрес не указан"}</p>
              <p>{formatCoordinates(selectedAdminPoint.lat, selectedAdminPoint.lng)}</p>
            </div>
          ) : null}
        </section>

        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>{editingPointId ? "Редактировать точку" : "Создать точку"}</h3>
            <form className="checkout-form" onSubmit={handleSavePoint}>
              <label className="field">
                <span>Название</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Город</span>
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Адрес</span>
                <input
                  value={form.address_text}
                  onChange={(event) => setForm((current) => ({ ...current, address_text: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Координаты</span>
                <input
                  id="admin-point-coordinates"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="coordinate-input"
                  value={form.coordinates}
                  onChange={(event) => setForm((current) => ({ ...current, coordinates: event.target.value }))}
                  placeholder="52.610923, 29.271421"
                  required
                />
                <small>Скопируйте из карты одной строкой: широта, долгота.</small>
              </label>
              <label className="field">
                <span>Описание</span>
                <textarea
                  className="field-textarea"
                  value={form.description}
                  maxLength={5000}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
                <small>До 5000 символов. Сейчас: {form.description.length}.</small>
              </label>
              <label className="consent-item">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                <span>Доступна для выбора экскурсоводами</span>
              </label>
              <div className="stack-actions">
                <button type="submit" className="button button-primary wide-button" disabled={busy}>
                  {busy ? "Сохраняем..." : editingPointId ? "Сохранить точку" : "Создать точку"}
                </button>
                {editingPointId ? (
                  <button type="button" className="button button-secondary wide-button" onClick={resetForm} disabled={busy}>
                    Отменить
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Справочник</h3>
            <form className="inline-field" onSubmit={handleSearch}>
              <label className="field">
                <span>Поиск</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Название, адрес или описание"
                />
              </label>
              <button type="submit" className="button button-secondary" disabled={busy}>
                Найти
              </button>
            </form>
            <div className="stack-list">
              {points.length > 0 ? (
                points.map((point) => (
                  <div key={point.id} className="stack-card">
                    <strong>{point.title}</strong>
                    <p>{point.address_text || "Адрес не указан"}</p>
                    <p>{formatCoordinates(point.lat, point.lng) || "Координаты не заданы"}</p>
                    <p>{point.is_active ? "Доступна для выбора" : "Скрыта из выбора"} · маршрутов: {point.tour_points_count}</p>
                    <div className="stack-actions">
                      <button type="button" className="mini-button" onClick={() => startEditPoint(point)}>
                        Редактировать
                      </button>
                      <button type="button" className="mini-button mini-button-danger" onClick={() => void handleDeletePoint(point)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="stack-card">
                  <strong>Точки не найдены</strong>
                  <p>Создайте первую точку или измените поисковый запрос.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </BackofficeGate>
  )
}

export function AdminFinancePage() {
  const { loading, hasRole } = useRequireRoles(["admin", "accountant"])
  const [salesRows, setSalesRows] = useState<Awaited<ReturnType<typeof loadAdminSalesTable>>["rows"]>([])
  const [settlements, setSettlements] = useState<Awaited<ReturnType<typeof loadAdminSettlements>> | null>(null)
  const [tours, setTours] = useState<AdminTourRecord[]>([])
  const [guides, setGuides] = useState<AdminGuideRecord[]>([])
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [refundBusyOrder, setRefundBusyOrder] = useState("")
  const [filters, setFilters] = useState({
    tour_id: "",
    guide_id: "",
    date_from: toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    date_to: toInputDate(new Date()),
  })
  const [payoutForm, setPayoutForm] = useState({
    guide_id: "",
    paid_on: toInputDate(new Date()),
    amount_rub: "",
    comment: "",
  })

  const refresh = async (nextFilters = filters) => {
    const salesFilterPayload = {
      tour_id: nextFilters.tour_id ? Number(nextFilters.tour_id) : undefined,
      guide_id: nextFilters.guide_id ? Number(nextFilters.guide_id) : undefined,
      date_from: nextFilters.date_from || undefined,
      date_to: nextFilters.date_to || undefined,
    }

    const settlementsFilterPayload = {
      guide_id: nextFilters.guide_id ? Number(nextFilters.guide_id) : undefined,
      date_from: nextFilters.date_from || undefined,
      date_to: nextFilters.date_to || undefined,
    }

    const [sales, nextSettlements, nextTours, nextGuides] = await Promise.all([
      loadAdminSalesTable(salesFilterPayload),
      loadAdminSettlements(settlementsFilterPayload),
      loadAdminTours(),
      loadAdminGuides(),
    ])

    setSalesRows(sales.rows)
    setSettlements(nextSettlements)
    setTours(nextTours.tours)
    setGuides(nextGuides.guides)
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh()
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить финансовые документы.")
      })
  }, [hasRole])

  const handleApplyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      await refresh(filters)
      setMessage("Финансовые документы обновлены.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось применить фильтры.")
    } finally {
      setBusy(false)
    }
  }

  const handlePreset = async (preset: ReportPresetKey) => {
    const nextFilters = {
      ...filters,
      ...buildPresetDates(preset),
    }

    setFilters(nextFilters)
    setBusy(true)
    setError("")
    setMessage("")

    try {
      await refresh(nextFilters)
      setMessage(`Финансовые документы обновлены: ${presetLabel(preset).toLowerCase()}.`)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось применить пресет периода.")
    } finally {
      setBusy(false)
    }
  }

  const handleCreatePayout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      await createAdminPayout({
        guide_id: Number(payoutForm.guide_id),
        paid_on: payoutForm.paid_on,
        amount_rub: Number(payoutForm.amount_rub),
        comment: payoutForm.comment || undefined,
      })
      setMessage("Ручная выплата сохранена.")
      setPayoutForm((current) => ({
        ...current,
        amount_rub: "",
        comment: "",
      }))
      await refresh(filters)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить выплату.")
    } finally {
      setBusy(false)
    }
  }

  const handleRefund = async (orderNumber: string | null) => {
    if (!orderNumber) {
      return
    }

    setRefundBusyOrder(orderNumber)
    setError("")
    setMessage("")

    try {
      const response = await refundAdminOrder(orderNumber)
      setMessage(`${response.message} Заказ ${response.order.order_number}: ${commerceStatusLabel(response.order.status)}.`)
      await refresh(filters)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось оформить возврат.")
    } finally {
      setRefundBusyOrder("")
    }
  }

  const handleExportSales = () => {
    downloadCsv(
      `audio42_sales_${filters.date_from}_${filters.date_to}.csv`,
      ["Дата оплаты", "Заказ", "Тур", "Экскурсовод", "Прайс", "Скидка", "Фактически получено", "Статус платежа"],
      salesRows.map((row) => [
        formatDateTime(row.paid_at),
        row.order_number || "—",
        row.tour_title || "Тур",
        row.guide_name || "—",
        row.unit_price_rub,
        row.discount_rub,
        row.final_price_rub,
        commerceStatusLabel(row.payment_status || row.order_status),
      ]),
    )
  }

  const handleExportSettlements = () => {
    if (!settlements) {
      return
    }

    downloadCsv(
      `audio42_settlements_${settlements.period.from}_${settlements.period.to}.csv`,
      ["Экскурсовод", "Продажи", "Вознаграждение %", "Вознаграждение", "Выплаты", "Баланс", "Порог достигнут"],
      settlements.rows.map((row) => [
        row.guide_name,
        row.sales_rub,
        row.reward_percent,
        row.reward_rub,
        row.payouts_rub,
        row.balance_rub,
        row.eligible_for_withdrawal ? "Да" : "Нет",
      ]),
    )
  }

  const handlePrintSales = () => {
    printTableReport({
      title: "Audio42 — таблица продаж",
      subtitle: `Период: ${filters.date_from} — ${filters.date_to}`,
      headers: ["Дата оплаты", "Заказ", "Тур", "Экскурсовод", "Прайс", "Скидка", "Фактически получено", "Статус"],
      rows: salesRows.map((row) => [
        formatDateTime(row.paid_at),
        row.order_number || "—",
        row.tour_title || "Тур",
        row.guide_name || "—",
        formatRub(row.unit_price_rub),
        formatRub(row.discount_rub),
        formatRub(row.final_price_rub),
        commerceStatusLabel(row.payment_status || row.order_status),
      ]),
    })
  }

  const handlePrintSettlements = () => {
    if (!settlements) {
      return
    }

    printTableReport({
      title: "Audio42 — оборотная ведомость",
      subtitle: `Период: ${settlements.period.from} — ${settlements.period.to}`,
      headers: ["Экскурсовод", "Продажи", "Вознаграждение %", "Вознаграждение", "Выплаты", "Баланс", "Порог достигнут"],
      rows: settlements.rows.map((row) => [
        row.guide_name,
        formatRub(row.sales_rub),
        `${row.reward_percent}%`,
        formatRub(row.reward_rub),
        formatRub(row.payouts_rub),
        formatRub(row.balance_rub),
        row.eligible_for_withdrawal ? "Да" : "Нет",
      ]),
    })
  }

  return (
    <BackofficeGate title="Финансы" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Бухгалтер</p>
          <h1>Продажи и расчёты</h1>
          <p className="lede">Таблица продаж и ведомость расчётов с экскурсоводами по текущему контуру данных.</p>
        </section>

        {error ? <section className="panel empty-state error-state">{error}</section> : null}
        {message ? <section className="panel empty-state form-success">{message}</section> : null}

        <section className="checkout-grid">
          <article className="panel checkout-form-card">
            <h3>Фильтры отчётов</h3>
            <form className="checkout-form" onSubmit={handleApplyFilters}>
              <div className="filter-presets">
                {(["this_month", "last_month", "this_quarter", "last_quarter"] as ReportPresetKey[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="mini-button"
                    disabled={busy}
                    onClick={() => void handlePreset(preset)}
                  >
                    {presetLabel(preset)}
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Экскурсовод</span>
                <select
                  className="field-select"
                  value={filters.guide_id}
                  onChange={(event) => setFilters((current) => ({ ...current, guide_id: event.target.value }))}
                >
                  <option value="">Все экскурсоводы</option>
                  {guides.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Тур</span>
                <select
                  className="field-select"
                  value={filters.tour_id}
                  onChange={(event) => setFilters((current) => ({ ...current, tour_id: event.target.value }))}
                >
                  <option value="">Все туры</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Дата с</span>
                <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
              </label>
              <label className="field">
                <span>Дата по</span>
                <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
              </label>
              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy ? "Обновляем..." : "Обновить отчёты"}
              </button>
            </form>
          </article>

          <article className="panel checkout-info">
            <h3>Ручная выплата экскурсоводу</h3>
            <form className="checkout-form" onSubmit={handleCreatePayout}>
              <label className="field">
                <span>Экскурсовод</span>
                <select
                  className="field-select"
                  value={payoutForm.guide_id}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, guide_id: event.target.value }))}
                  required
                >
                  <option value="">Выберите экскурсовода</option>
                  {guides.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Дата выплаты</span>
                <input
                  type="date"
                  value={payoutForm.paid_on}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, paid_on: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Сумма, ₽</span>
                <input
                  value={payoutForm.amount_rub}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, amount_rub: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Комментарий</span>
                <textarea
                  className="field-textarea"
                  value={payoutForm.comment}
                  onChange={(event) => setPayoutForm((current) => ({ ...current, comment: event.target.value }))}
                />
              </label>
              <button type="submit" className="button button-primary wide-button" disabled={busy}>
                {busy ? "Сохраняем..." : "Зарегистрировать выплату"}
              </button>
            </form>
          </article>
        </section>

        <section className="admin-grid">
          <article className="panel admin-module wide">
            <div className="module-head">
              <span className="module-tag">Таблица продаж</span>
              <div className="module-actions">
                <button type="button" className="mini-button" onClick={handleExportSales}>
                  CSV
                </button>
                <button type="button" className="mini-button" onClick={handlePrintSales}>
                  Печать
                </button>
              </div>
            </div>
            <h3>Дата, тур, сумма</h3>
            <div className="order-history">
              {salesRows.length > 0 ? (
                salesRows.map((row) => (
                  <article key={`${row.order_number}-${row.tour_id}-${row.paid_at}`} className="order-row">
                    <div>
                      <strong>{row.tour_title || "Тур"}</strong>
                      <p>{row.guide_name || "Экскурсовод"}</p>
                    </div>
                    <div>
                      <strong>{row.order_number || "—"}</strong>
                      <p>{formatDateTime(row.paid_at)}</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.final_price_rub)}</strong>
                      <p>РЎРєРёРґРєР°: {formatRub(row.discount_rub)}</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.unit_price_rub)}</strong>
                      <p>Прайс до скидки</p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="mini-button"
                        disabled={!row.order_number || refundBusyOrder === row.order_number}
                        onClick={() => void handleRefund(row.order_number)}
                      >
                        {refundBusyOrder === row.order_number ? "Возвращаем..." : "Вернуть"}
                      </button>
                      <p>{commerceStatusLabel(row.payment_status || row.order_status)}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p>Продажи пока не появились.</p>
              )}
            </div>
          </article>

          <article className="panel admin-module wide">
            <div className="module-head">
              <span className="module-tag">Оборотная ведомость</span>
              <div className="module-actions">
                <button type="button" className="mini-button" onClick={handleExportSettlements} disabled={!settlements?.rows.length}>
                  CSV
                </button>
                <button type="button" className="mini-button" onClick={handlePrintSettlements} disabled={!settlements?.rows.length}>
                  Печать
                </button>
              </div>
            </div>
            <h3>Авто-часть по экскурсоводам</h3>
            <div className="order-history">
              {settlements?.rows.length ? (
                settlements.rows.map((row) => (
                  <article key={row.guide_id} className="order-row">
                    <div>
                      <strong>{row.guide_name}</strong>
                      <p>Период: {settlements.period.from} — {settlements.period.to}</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.sales_rub)}</strong>
                      <p>Продажи с учётом скидок</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.reward_rub)}</strong>
                      <p>{row.reward_percent}% вознаграждение</p>
                    </div>
                    <div>
                      <strong>{formatRub(row.balance_rub)}</strong>
                      <p>{row.eligible_for_withdrawal ? "Можно готовить выплату" : "Порог вывода пока не достигнут"}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p>Данных по ведомости пока нет.</p>
              )}
            </div>
            {settlements?.rows.length ? (
              <div className="stack-list">
                {settlements.rows.map((row) => (
                  <div key={`payouts-${row.guide_id}`} className="stack-card">
                    <strong>{row.guide_name}</strong>
                    <p>
                      Выплачено: {formatRub(row.payouts_rub)} · Баланс: {formatRub(row.balance_rub)}
                    </p>
                    {row.payout_entries.length ? (
                      row.payout_entries.map((entry) => (
                        <p key={entry.id}>
                          {formatDate(entry.paid_on)} В· {formatRub(entry.amount_rub)}
                          {entry.comment ? ` В· ${entry.comment}` : ""}
                        </p>
                      ))
                    ) : (
                      <p>Ручных выплат в выбранном периоде пока нет.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </BackofficeGate>
  )
}

type TrafficInterval = "day" | "month"

function trafficPreset(interval: TrafficInterval): ReportDateFilters {
  const today = new Date()

  if (interval === "month") {
    return {
      date_from: toInputDate(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
      date_to: toInputDate(today),
    }
  }

  return {
    date_from: toInputDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)),
    date_to: toInputDate(today),
  }
}

function trafficDateLabel(value: string, interval: TrafficInterval) {
  const date = new Date(`${value}T00:00:00`)

  return new Intl.DateTimeFormat("ru-RU", interval === "month"
    ? { month: "short", year: "numeric" }
    : { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

function trafficCompactDateLabel(value: string, interval: TrafficInterval) {
  const date = new Date(`${value}T00:00:00`)

  return new Intl.DateTimeFormat("ru-RU", interval === "month"
    ? { month: "short" }
    : { day: "2-digit", month: "short" }).format(date)
}

function trafficPickerDateLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function trafficPercent(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`
}

function trafficSourceGroupLabel(label: string) {
  if (label === "direct") return "Прямые заходы"
  if (label === "search") return "Поисковые системы"
  if (label === "internal") return "Внутренние переходы"
  if (label === "external") return "Сторонние сайты"
  if (label === "social") return "Социальные сети"
  if (label === "ads") return "Реклама"
  if (label === "mail") return "Почтовые рассылки"
  if (label === "undefined") return "Не определено"
  return analyticsSourceLabel(label)
}

type UtmBuilderForm = {
  path: string
  source: string
  medium: string
  campaign: string
  content: string
  term: string
}

const UTM_PAGE_OPTIONS = [
  { value: "/", label: "Главная" },
  { value: "/excursions", label: "Каталог маршрутов" },
  { value: "/guides", label: "Авторы" },
  { value: "/map", label: "Карта" },
  { value: "/contacts", label: "Контакты" },
]

const UTM_SOURCE_OPTIONS = ["vk", "telegram", "yandex", "google", "2gis", "email", "partner", "offline"]
const UTM_MEDIUM_OPTIONS = ["social", "cpc", "banner", "email", "partner", "qr", "post"]

function normalizeUtmPath(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return "/"
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      return `${parsed.pathname || "/"}${parsed.search}${parsed.hash}`
    } catch {
      return "/"
    }
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function buildUtmUrl(form: UtmBuilderForm) {
  const url = new URL(normalizeUtmPath(form.path), PUBLIC_SITE_ORIGIN)
  const params = new URLSearchParams(url.search)
  const values: Array<[string, string]> = [
    ["utm_source", form.source],
    ["utm_medium", form.medium],
    ["utm_campaign", form.campaign],
    ["utm_content", form.content],
    ["utm_term", form.term],
  ]

  values.forEach(([key, value]) => {
    const normalized = value.trim()

    if (normalized) {
      params.set(key, normalized)
    } else {
      params.delete(key)
    }
  })

  url.search = params.toString()
  return url.toString()
}

function TrafficSourceBars({
  title,
  subtitle,
  rows,
  tone,
  translateGroupLabels = false,
  showEmpty = false,
}: {
  title: string
  subtitle?: string
  rows: Awaited<ReturnType<typeof loadAdminTrafficStats>>["source_groups"]
  tone: "sources" | "search" | "external" | "social" | "mail" | "neutral"
  translateGroupLabels?: boolean
  showEmpty?: boolean
}) {
  const visibleRows = showEmpty ? rows : rows.filter((row) => row.entries_count > 0)

  if (!visibleRows.length) {
    return null
  }

  return (
    <section className={`traffic-source-section traffic-source-${tone}`}>
      <div className="traffic-source-title">
        <h2>{title}</h2>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className="traffic-source-bars">
        {visibleRows.map((row) => (
          <div className={`traffic-source-row traffic-source-row-${row.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} key={`${tone}-${row.label}`}>
            <div className="traffic-source-meta">
              <span>{translateGroupLabels ? trafficSourceGroupLabel(row.label) : analyticsSourceLabel(row.label)}</span>
              <small>{row.entries_count.toLocaleString("ru-RU")}</small>
              <strong>{row.percent}%</strong>
            </div>
            <div className="traffic-source-track">
              <span style={{ width: `${Math.max(row.entries_count > 0 ? 1 : 0, row.percent)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TrafficGeoBars({
  title,
  rows,
}: {
  title: string
  rows: Awaited<ReturnType<typeof loadAdminTrafficStats>>["top_countries"]
}) {
  return (
    <section className="traffic-geo-section">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="traffic-geo-bars">
          {rows.map((row) => (
            <div className="traffic-geo-row" key={`${title}-${row.code ?? ""}-${row.label}`}>
              <div className="traffic-source-meta">
                <span>{row.code ? <b>{row.code}</b> : null}{row.label}</span>
                <small>{row.visitors_count.toLocaleString("ru-RU")}</small>
                <strong>{row.percent}%</strong>
              </div>
              <div className="traffic-source-track">
                <span style={{ width: `${Math.max(1, row.percent)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="traffic-geo-empty">Данные появятся после записи страны или города для новых посещений.</p>
      )}
    </section>
  )
}

function TrafficTrendChart({
  title,
  total,
  rows,
  metric,
  interval,
  tone,
}: {
  title: string
  total: number
  rows: Awaited<ReturnType<typeof loadAdminTrafficStats>>["period_rows"]
  metric: "sessions_count" | "leads_count"
  interval: TrafficInterval
  tone: "sessions" | "leads"
}) {
  const values = rows.map((row) => row[metric])
  const maxValue = Math.max(1, ...values)
  const width = 980
  const height = 340
  const padding = { top: 18, right: 14, bottom: 34, left: 36 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const gridMax = Math.max(5, Math.ceil(maxValue / 5) * 5)
  const gridSteps = Array.from({ length: 7 }, (_, index) => {
    const ratio = index / 6

    return {
      value: Math.round(gridMax * (1 - ratio)),
      y: padding.top + ratio * chartHeight,
    }
  })
  const points = values.map((value, index) => {
    const x = rows.length <= 1 ? padding.left + chartWidth / 2 : padding.left + (index / (rows.length - 1)) * chartWidth
    const y = padding.top + chartHeight - (value / gridMax) * chartHeight
    return `${x},${y}`
  }).join(" ")
  const areaPoints = points
    ? `${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}`
    : ""
  const labelEvery = Math.max(1, Math.ceil(rows.length / 10))
  const dateSteps = rows.map((row, index) => {
    if (index % labelEvery && index !== rows.length - 1) {
      return null
    }

    return {
      row,
      x: rows.length <= 1 ? padding.left + chartWidth / 2 : padding.left + (index / (rows.length - 1)) * chartWidth,
    }
  }).filter((step): step is { row: typeof rows[number], x: number } => Boolean(step))

  return (
    <article className={`traffic-trend-panel traffic-trend-${tone}`}>
      <div className="traffic-trend-head">
        <h2>{title}</h2>
        <strong>{total.toLocaleString("ru-RU")}</strong>
      </div>
      {rows.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="traffic-trend-svg" aria-hidden="true">
          {gridSteps.map((step) => (
            <g key={`${tone}-grid-${step.y}`} className="traffic-chart-y-step">
              <line x1={padding.left} y1={step.y} x2={width - padding.right} y2={step.y} />
              <text x={padding.left - 8} y={step.y + 4}>{step.value}</text>
            </g>
          ))}
          {dateSteps.map((step) => (
            <g key={`${tone}-date-grid-${step.row.period}`} className="traffic-chart-x-step">
              <line x1={step.x} y1={padding.top} x2={step.x} y2={height - padding.bottom} />
              <line x1={step.x} y1={height - padding.bottom} x2={step.x} y2={height - padding.bottom + 7} />
              <text className="traffic-chart-date" x={step.x} y={height - 10}>
                {trafficCompactDateLabel(step.row.period, interval)}
              </text>
            </g>
          ))}
          <line className="traffic-chart-axis" x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} />
          <line className="traffic-chart-axis" x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} />
          <g className="traffic-chart-legend">
            <rect x={width - 68} y={padding.top + 8} width={13} height={9} />
            <text x={width - 14} y={padding.top + 17}>{title}</text>
          </g>
          <polygon points={areaPoints} />
          <polyline points={points} />
          {rows.map((row, index) => {
            const x = rows.length <= 1 ? padding.left + chartWidth / 2 : padding.left + (index / (rows.length - 1)) * chartWidth
            const y = padding.top + chartHeight - (row[metric] / gridMax) * chartHeight
            return <circle key={`${tone}-${row.period}`} cx={x} cy={y} r={3.5} />
          })}
        </svg>
      ) : (
        <p className="form-hint">За выбранный период данных пока нет.</p>
      )}
    </article>
  )
}

export function AdminTrafficPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [interval, setInterval] = useState<TrafficInterval>("day")
  const [filters, setFilters] = useState(trafficPreset("day"))
  const [stats, setStats] = useState<Awaited<ReturnType<typeof loadAdminTrafficStats>> | null>(null)
  const [pageStats, setPageStats] = useState<Awaited<ReturnType<typeof loadAdminTrafficStats>> | null>(null)
  const [selectedPagePath, setSelectedPagePath] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [pageBusy, setPageBusy] = useState(false)
  const [utmForm, setUtmForm] = useState<UtmBuilderForm>({
    path: "/excursions",
    source: "vk",
    medium: "social",
    campaign: "",
    content: "",
    term: "",
  })
  const [utmCopyMessage, setUtmCopyMessage] = useState("")

  const refresh = async (nextFilters = filters, nextInterval = interval) => {
    const nextStats = await loadAdminTrafficStats({
      ...nextFilters,
      interval: nextInterval,
    })

    setStats(nextStats)
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh()
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить статистику посещений.")
      })
  }, [hasRole])

  const applyInterval = async (nextInterval: TrafficInterval) => {
    const nextFilters = trafficPreset(nextInterval)

    setBusy(true)
    setError("")
    setInterval(nextInterval)
    setFilters(nextFilters)
    setPageStats(null)
    setSelectedPagePath("")

    try {
      await refresh(nextFilters, nextInterval)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить период статистики.")
    } finally {
      setBusy(false)
    }
  }

  const handleApplyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setPageStats(null)
    setSelectedPagePath("")

    try {
      await refresh(filters, interval)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось применить даты статистики.")
    } finally {
      setBusy(false)
    }
  }

  const inspectPage = async (pagePath: string) => {
    setPageBusy(true)
    setError("")
    setSelectedPagePath(pagePath)

    try {
      setPageStats(await loadAdminTrafficStats({
        ...filters,
        interval,
        page_path: pagePath,
      }))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось открыть статистику страницы.")
    } finally {
      setPageBusy(false)
    }
  }

  const rows = stats?.period_rows ?? []
  const sourcePercent = (label: string) => (stats?.source_groups ?? []).find((row) => row.label === label)?.percent ?? 0
  const generatedUtmUrl = useMemo(() => buildUtmUrl(utmForm), [utmForm])
  const canCopyUtmUrl = Boolean(utmForm.source.trim() && utmForm.medium.trim() && utmForm.campaign.trim())

  const updateUtmField = (field: keyof UtmBuilderForm, value: string) => {
    setUtmCopyMessage("")
    setUtmForm((current) => ({ ...current, [field]: value }))
  }

  const copyUtmUrl = async () => {
    if (!canCopyUtmUrl) {
      setUtmCopyMessage("Заполните источник, канал и кампанию.")
      return
    }

    try {
      await navigator.clipboard.writeText(generatedUtmUrl)
      setUtmCopyMessage("Ссылка скопирована.")
    } catch {
      setUtmCopyMessage("Не удалось скопировать автоматически. Выделите ссылку вручную.")
    }
  }

  return (
    <BackofficeGate title="Статистика посещений" allowed={hasRole} loading={loading}>
      <div className="page section-page tilda-traffic-page">
        <section className="traffic-statistics-head">
          <div className="traffic-section-tabs">
            <strong>Статистика сайта</strong>
            <span>Интернет-магазин</span>
          </div>
          <div className="traffic-period-toolbar">
            <div className="traffic-period-controls">
              <div className="traffic-period-buttons" aria-label="Интервал статистики">
                <button type="button" className={interval === "day" ? "active" : ""} disabled={busy} onClick={() => void applyInterval("day")}>
                  За месяц
                </button>
                <button type="button" className={interval === "month" ? "active" : ""} disabled={busy} onClick={() => void applyInterval("month")}>
                  За год
                </button>
              </div>
              <details className="traffic-date-picker">
                <summary>
                  <span aria-hidden="true">▣</span>
                  {trafficPickerDateLabel(filters.date_from)} - {trafficPickerDateLabel(filters.date_to)}
                </summary>
                <form className="traffic-date-form" onSubmit={handleApplyFilters}>
                  <label>
                    <span>С</span>
                    <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
                  </label>
                  <label>
                    <span>По</span>
                    <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
                  </label>
                  <button type="submit" className="mini-button" disabled={busy}>{busy ? "..." : "Показать"}</button>
                </form>
              </details>
            </div>
            <a href="https://audiogid42.ru" target="_blank" rel="noreferrer" className="traffic-domain-link">
              audiogid42.ru
            </a>
          </div>
        </section>

        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="traffic-summary-section">
          <h2>Суммарные показатели за период</h2>
          <div className="traffic-kpi-grid">
            <article className="traffic-kpi-card">
              <span>Сессии <i aria-hidden="true">i</i></span>
              <strong>{stats?.summary.sessions_count.toLocaleString("ru-RU") ?? "—"}</strong>
              <p className="traffic-kpi-note">Просмотры: {stats?.summary.views_count.toLocaleString("ru-RU") ?? "—"}</p>
            </article>
            <article className="traffic-kpi-card traffic-device-card">
              <span>Устройство <i aria-hidden="true">i</i></span>
              <strong aria-hidden="true">&nbsp;</strong>
              <p>Десктоп <b>{stats ? trafficPercent(stats.summary.desktop_percent) : "—"}</b></p>
              <p>Мобильные <b>{stats ? trafficPercent(stats.summary.mobile_percent) : "—"}</b></p>
            </article>
            <article className="traffic-kpi-card">
              <span>Заявки <i aria-hidden="true">i</i></span>
              <strong>{stats?.summary.leads_count.toLocaleString("ru-RU") ?? "—"} шт.</strong>
              <p className="traffic-kpi-note">Публичные обращения сайта</p>
            </article>
            <article className="traffic-kpi-card">
              <span>Конверсия <i aria-hidden="true">i</i></span>
              <strong>{stats ? trafficPercent(stats.summary.conversion_percent) : "—"}</strong>
              <p className="traffic-kpi-note">Заявки / сессии</p>
            </article>
          </div>
        </section>

        <div className="traffic-trend-grid">
          <TrafficTrendChart
            title="Сессии"
            total={stats?.summary.sessions_count ?? 0}
            rows={rows}
            metric="sessions_count"
            interval={interval}
            tone="sessions"
          />
        </div>

        {stats ? (
          <div className="traffic-source-report">
            <TrafficSourceBars
              title="Источники переходов"
              subtitle={`${trafficPickerDateLabel(filters.date_from)} - ${trafficPickerDateLabel(filters.date_to)}`}
              rows={stats.source_groups ?? []}
              tone="sources"
              translateGroupLabels
              showEmpty
            />
            <TrafficSourceBars
              title="Поисковые системы"
              subtitle={`${sourcePercent("search")}% посетителей`}
              rows={stats.search_sources ?? []}
              tone="search"
            />
            <TrafficSourceBars
              title="Сторонние сайты"
              subtitle={`${sourcePercent("external")}% посетителей`}
              rows={stats.external_sites ?? []}
              tone="external"
            />
            <TrafficSourceBars
              title="Социальные сети"
              subtitle={`${sourcePercent("social")}% посетителей`}
              rows={stats.social_sources ?? []}
              tone="social"
            />
            <TrafficSourceBars
              title="Почтовые рассылки"
              subtitle={`${sourcePercent("mail")}% посетителей`}
              rows={stats.mail_sources ?? []}
              tone="mail"
            />
            <div className="traffic-geo-report">
              <TrafficGeoBars title="Топ-10 по странам" rows={stats.top_countries ?? []} />
              <TrafficGeoBars title="Топ-10 по городам" rows={stats.top_cities ?? []} />
            </div>
          </div>
        ) : null}

        <section className="panel admin-traffic-panel traffic-visits-panel">
          <div className="traffic-table-head">
            <h2>Посещения и конверсия</h2>
            <span>{filters.date_from} - {filters.date_to}</span>
          </div>
          <div className="traffic-table-wrap">
            <table className="traffic-table traffic-visits-table">
              <thead>
                <tr>
                  <th>{interval === "month" ? "Месяц" : "Дата"}</th>
                  <th>Просмотры</th>
                  <th>Сессии</th>
                  <th>Посетители</th>
                  <th>Desktop / Mobile</th>
                  <th>Заявки</th>
                  <th>Конверсия (%)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.slice().reverse().map((row) => (
                  <tr key={row.period}>
                    <td>{trafficDateLabel(row.period, interval)}</td>
                    <td>{row.views_count}</td>
                    <td>{row.sessions_count}</td>
                    <td>{row.visitors_count}</td>
                    <td>{row.desktop_percent}% / {row.mobile_percent}%</td>
                    <td>{row.leads_count}</td>
                    <td>{row.conversion_percent.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>Нет данных за выбранный период.</td>
                  </tr>
                )}
                {stats ? (
                  <tr className="traffic-total-row">
                    <td>Всего</td>
                    <td>{stats.summary.views_count}</td>
                    <td>{stats.summary.sessions_count}</td>
                    <td>{stats.summary.visitors_count}</td>
                    <td>{Math.round(stats.summary.desktop_percent)}% / {Math.round(stats.summary.mobile_percent)}%</td>
                    <td>{stats.summary.leads_count}</td>
                    <td>{stats.summary.conversion_percent.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="traffic-pages-report">
          <article className="admin-traffic-panel traffic-pages-panel">
            <div className="traffic-table-head">
              <h2>Популярные страницы</h2>
              <span>Нажмите страницу для детализации</span>
            </div>
            <div className="traffic-table-wrap">
              <table className="traffic-table">
                <thead>
                  <tr>
                    <th>Страница</th>
                    <th>Просмотры</th>
                    <th>Сессии</th>
                    <th>Посетители</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.top_pages.length ? stats.top_pages.map((row) => (
                    <tr key={row.path}>
                      <td>
                        <button type="button" className="traffic-page-button" disabled={pageBusy} onClick={() => void inspectPage(row.path)}>
                          {row.path}
                        </button>
                      </td>
                      <td>{row.views_count}</td>
                      <td>{row.sessions_count}</td>
                      <td>{row.visitors_count}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4}>Нет данных.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {pageStats ? (
            <article className="admin-traffic-panel traffic-page-detail-panel">
              <div className="traffic-table-head">
                <h2>Статистика страницы</h2>
                <span>{selectedPagePath}</span>
              </div>
              <div className="traffic-page-summary">
                <strong>{pageStats.summary.views_count} просмотров</strong>
                <span>{pageStats.summary.sessions_count} сессий</span>
                <span>{pageStats.summary.visitors_count} посетителей</span>
              </div>
              <div className="traffic-table-wrap">
                <table className="traffic-table traffic-page-detail-table">
                  <thead>
                    <tr>
                      <th>{interval === "month" ? "Месяц" : "Дата"}</th>
                      <th>Просмотры</th>
                      <th>Сессии</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStats.period_rows.slice().reverse().map((row) => (
                      <tr key={`page-${row.period}`}>
                        <td>{trafficDateLabel(row.period, interval)}</td>
                        <td>{row.views_count}</td>
                        <td>{row.sessions_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          <article className="admin-traffic-panel traffic-pages-panel">
            <div className="traffic-table-head">
              <h2>Страницы входа</h2>
              <span>Первые страницы визитов</span>
            </div>
            <div className="traffic-table-wrap">
              <table className="traffic-table traffic-landing-pages-table">
                <thead>
                  <tr>
                    <th>Страница</th>
                    <th>Входы</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.landing_pages.length ? stats.landing_pages.map((row) => (
                    <tr key={row.path}>
                      <td>{row.path}</td>
                      <td>{row.entries_count}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2}>Нет данных.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="admin-traffic-panel traffic-utm-builder" aria-labelledby="utm-builder-title">
          <div className="traffic-table-head traffic-utm-builder-head">
            <div>
              <h2 id="utm-builder-title">Конструктор UTM-ссылок</h2>
              <p>Соберите ссылку для рекламы, рассылки или поста. Переходы появятся ниже в таблице UTM-меток.</p>
            </div>
            <span>Для audiogid42.ru</span>
          </div>
          <div className="utm-builder-form">
            <label>
              <span>Страница</span>
              <input
                list="utm-page-options"
                value={utmForm.path}
                onChange={(event) => updateUtmField("path", event.target.value)}
                placeholder="/excursions"
              />
            </label>
            <datalist id="utm-page-options">
              {UTM_PAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
            <label>
              <span>Источник</span>
              <input
                list="utm-source-options"
                value={utmForm.source}
                onChange={(event) => updateUtmField("source", event.target.value)}
                placeholder="vk"
              />
            </label>
            <datalist id="utm-source-options">
              {UTM_SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <label>
              <span>Канал</span>
              <input
                list="utm-medium-options"
                value={utmForm.medium}
                onChange={(event) => updateUtmField("medium", event.target.value)}
                placeholder="social"
              />
            </label>
            <datalist id="utm-medium-options">
              {UTM_MEDIUM_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <label>
              <span>Кампания</span>
              <input
                value={utmForm.campaign}
                onChange={(event) => updateUtmField("campaign", event.target.value)}
                placeholder="kemerovo_may"
              />
            </label>
            <label>
              <span>Content</span>
              <input
                value={utmForm.content}
                onChange={(event) => updateUtmField("content", event.target.value)}
                placeholder="banner_1"
              />
            </label>
            <label>
              <span>Term</span>
              <input
                value={utmForm.term}
                onChange={(event) => updateUtmField("term", event.target.value)}
                placeholder="optional"
              />
            </label>
          </div>
          <div className="utm-builder-result">
            <div>
              <span>Готовая ссылка</span>
              <output>{generatedUtmUrl}</output>
            </div>
            <button type="button" onClick={() => void copyUtmUrl()} disabled={!canCopyUtmUrl}>
              Скопировать
            </button>
          </div>
          {utmCopyMessage ? <p className="utm-builder-message">{utmCopyMessage}</p> : null}
        </section>

        <section className="panel admin-traffic-panel">
          <div className="traffic-table-head">
            <h2>UTM-метки</h2>
            <span>Кампании, источники и каналы переходов</span>
          </div>
          <div className="traffic-table-wrap">
            <table className="traffic-table">
              <thead>
                <tr>
                  <th>Источник</th>
                  <th>Канал</th>
                  <th>Кампания</th>
                  <th>UTM content</th>
                  <th>UTM term</th>
                  <th>Просмотры</th>
                  <th>Сессии</th>
                  <th>Входы</th>
                </tr>
              </thead>
              <tbody>
                {stats?.utm_campaigns.length ? stats.utm_campaigns.map((row) => (
                  <tr key={`${row.source ?? "source"}-${row.medium ?? "medium"}-${row.campaign ?? "campaign"}-${row.content ?? "content"}-${row.term ?? "term"}`}>
                    <td>{row.source || "—"}</td>
                    <td>{row.medium || "—"}</td>
                    <td>{row.campaign || "—"}</td>
                    <td>{row.content || "-"}</td>
                    <td>{row.term || "-"}</td>
                    <td>{row.views_count}</td>
                    <td>{row.sessions_count}</td>
                    <td>{row.entries_count}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8}>Переходов с UTM-метками пока нет.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </BackofficeGate>
  )
}

function searchEngineCheckLabel(status: AdminSearchEngineStatus["checks"][number]["status"]) {
  if (status === "ok") return "Готово"
  if (status === "warning") return "Проверить"
  return "Ошибка"
}

function searchEngineStatusLabel(status: AdminSearchEngineStatus["engines"][number]["status"]) {
  if (status === "verification_tag_detected") return "Тег найден"
  return "Ждет подтверждения"
}

export function AdminSearchEnginePage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [status, setStatus] = useState<AdminSearchEngineStatus | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setBusy(true)
    setError("")

    try {
      setStatus(await loadAdminSearchEngineStatus())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось проверить состояние сайта для поисковиков.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (hasRole) {
      void refresh()
    }
  }, [hasRole])

  return (
    <BackofficeGate title="Поисковые системы" allowed={hasRole} loading={loading}>
      <div className="page section-page search-engine-page">
        <section className="panel page-intro search-engine-intro">
          <p className="eyebrow">Админка</p>
          <h1>Поисковые системы</h1>
          <p className="lede">
            Техническая готовность audiogid42.ru для Google Search Console и Яндекс Вебмастера.
          </p>
        </section>

        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="panel search-engine-overview">
          <div>
            <span className="eyebrow">Статус сайта</span>
            <h2>{status?.site.ready_for_submission ? "Сайт готов к добавлению" : "Нужна проверка SEO-контура"}</h2>
            <p>
              Главная, robots.txt и sitemap.xml проверяются с сервера бэкофиса. Статус владения и индексации
              подтверждают сами кабинеты поисковиков.
            </p>
          </div>
          <div className="search-engine-overview-actions">
            <a href={status?.site.origin || PUBLIC_SITE_ORIGIN} target="_blank" rel="noreferrer" className="mini-link">
              Открыть сайт
            </a>
            <button type="button" className="button button-primary" disabled={busy} onClick={() => void refresh()}>
              {busy ? "Проверяем..." : "Проверить сейчас"}
            </button>
          </div>
        </section>

        <section className="search-engine-checks" aria-label="Технические проверки сайта">
          {(status?.checks ?? []).map((check) => (
            <article key={check.key} className={`panel search-engine-check search-engine-check-${check.status}`}>
              <div className="search-engine-check-head">
                <h2>{check.label}</h2>
                <span>{searchEngineCheckLabel(check.status)}</span>
              </div>
              <p>{check.detail}</p>
              <a href={check.url} target="_blank" rel="noreferrer">
                {check.url}
              </a>
            </article>
          ))}
        </section>

        <section className="search-engine-console-grid" aria-label="Статус кабинетов поисковиков">
          {(status?.engines ?? []).map((engine) => (
            <article key={engine.key} className="panel search-engine-console-card">
              <div className="search-engine-console-head">
                <div>
                  <p className="eyebrow">Кабинет поисковика</p>
                  <h2>{engine.name}</h2>
                </div>
                <span className={`search-engine-console-status search-engine-console-status-${engine.status}`}>
                  {searchEngineStatusLabel(engine.status)}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Тег проверки</dt>
                  <dd>{engine.verification_tag_name}</dd>
                </div>
                <div>
                  <dt>На главной</dt>
                  <dd>{engine.verification_tag_present ? `Найден ${engine.verification_tag_preview || ""}` : "Не найден"}</dd>
                </div>
                <div>
                  <dt>Sitemap</dt>
                  <dd>{status?.site.sitemap_url || "https://audiogid42.ru/sitemap.xml"}</dd>
                </div>
              </dl>
              <p>{engine.note}</p>
              <a href={engine.console_url} target="_blank" rel="noreferrer" className="button button-secondary">
                Открыть кабинет
              </a>
            </article>
          ))}
        </section>

        <section className="panel search-engine-next-steps">
          <div>
            <p className="eyebrow">Следующий шаг</p>
            <h2>Подтверждение владения</h2>
          </div>
          <ol>
            <li>Добавить https://audiogid42.ru в Google Search Console и Яндекс Вебмастер.</li>
            <li>Получить способ подтверждения: метатег, HTML-файл или DNS-запись.</li>
            <li>После подтверждения отправить в оба кабинета https://audiogid42.ru/sitemap.xml.</li>
          </ol>
          <p className="form-hint">
            Если поисковик выдал метатег, его можно поставить в главную страницу сайта и эта страница покажет,
            что тег уже доступен роботу.
          </p>
        </section>
      </div>
    </BackofficeGate>
  )
}

export function AdminToursPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [tours, setTours] = useState<AdminTourRecord[]>([])
  const [drafts, setDrafts] = useState<Record<number, {
    title: string
    short_description: string
    full_description: string
    audience_description: string
    duration_minutes: string
    price_rub: string
    cover_image_url: string
    gallery_text: string
    status: "draft" | "published" | "archived"
  }>>({})
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busyTourId, setBusyTourId] = useState<number | null>(null)

  const refresh = async () => {
    const payload = await loadAdminTours()
    setTours(payload.tours)
    setDrafts(Object.fromEntries(payload.tours.map((tour) => [
      tour.id,
      {
        title: tour.title,
        short_description: tour.short_description || "",
        full_description: tour.full_description || "",
        audience_description: tour.audience_description || "",
        duration_minutes: tour.duration_minutes ? String(tour.duration_minutes) : "",
        price_rub: String(tour.price_rub),
        cover_image_url: tour.cover_image_url || "",
        gallery_text: galleryArrayToText(tour.gallery_image_urls),
        status: tour.status,
      },
    ])))
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить туры.")
    })
  }, [hasRole])

  const handleStatusChange = async (tourId: number, status: "draft" | "published" | "archived") => {
    setMessage("")
    setError("")

    try {
      await updateAdminTour(tourId, { status })
      setMessage("Статус тура обновлён.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить тур.")
    }
  }

  const updateDraft = (tourId: number, field: keyof typeof drafts[number], value: string) => {
    setDrafts((current) => ({
      ...current,
      [tourId]: {
        ...current[tourId],
        [field]: value,
      },
    }))
  }

  const handleSaveTour = async (tourId: number) => {
    const draft = drafts[tourId]
    if (!draft) {
      return
    }

    setMessage("")
    setError("")

    try {
      await updateAdminTour(tourId, {
        title: draft.title,
        short_description: draft.short_description || null,
        full_description: draft.full_description || null,
        audience_description: draft.audience_description || null,
        duration_minutes: draft.duration_minutes ? Number(draft.duration_minutes) : null,
        price_rub: Number(draft.price_rub),
        cover_image_url: draft.cover_image_url || null,
        gallery_json: galleryTextToArray(draft.gallery_text),
        status: draft.status,
      })
      setMessage("Тур сохранён.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить тур.")
    }
  }

  const handleDeleteTour = async (tourId: number) => {
    if (!window.confirm("Удалить тур? Если по нему уже были продажи или доступы, он будет переведён в архив.")) {
      return
    }

    setBusyTourId(tourId)
    setMessage("")
    setError("")

    try {
      const response = await deleteAdminTour(tourId)
      setMessage(response.message)
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось удалить тур.")
    } finally {
      setBusyTourId(null)
    }
  }

  return (
    <BackofficeGate title="Туры" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Туры и публикация</h1>
          <p className="lede">Управление каталогом: статус, цена, контент и привязка к экскурсоводу.</p>
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="order-history">
          {tours.map((tour) => (
            <article key={tour.id} className="panel order-row">
              <div>
                <strong>{tour.title}</strong>
                <p>{tour.guide?.display_name || "Экскурсовод"}</p>
                <p>{tour.short_description || "Описание пока не заполнено."}</p>
              </div>
              <div>
                <strong>{formatRub(tour.price_rub)}</strong>
                <p>{tour.duration_minutes ? `${tour.duration_minutes} мин` : "Длительность не задана"}</p>
              </div>
              <div>
                <strong>{tourStatusLabel(tour.status)}</strong>
                <p>Точек: {tour.tour_points_count}, треков: {tour.tracks_count}</p>
              </div>
              <div className="stack-list">
                <button className="mini-button" onClick={() => void handleStatusChange(tour.id, "draft")}>
                  В черновик
                </button>
                <button className="mini-button" onClick={() => void handleStatusChange(tour.id, "published")}>
                  Опубликовать
                </button>
                <button className="mini-button" onClick={() => void handleStatusChange(tour.id, "archived")}>
                  В архив
                </button>
                <button className="mini-button" onClick={() => void handleSaveTour(tour.id)}>
                  Сохранить
                </button>
                <button
                  className="mini-button mini-button-danger"
                  disabled={busyTourId === tour.id}
                  onClick={() => void handleDeleteTour(tour.id)}
                >
                  {busyTourId === tour.id ? "Удаляем..." : "Удалить"}
                </button>
              </div>
              <div className="stack-list">
                <label className="field">
                  <span>Название</span>
                  <input value={drafts[tour.id]?.title || ""} onChange={(event) => updateDraft(tour.id, "title", event.target.value)} />
                </label>
                <label className="field">
                  <span>Цена</span>
                  <input value={drafts[tour.id]?.price_rub || ""} onChange={(event) => updateDraft(tour.id, "price_rub", event.target.value)} />
                </label>
                <label className="field">
                  <span>Длительность, мин</span>
                  <input value={drafts[tour.id]?.duration_minutes || ""} onChange={(event) => updateDraft(tour.id, "duration_minutes", event.target.value)} />
                </label>
                <label className="field">
                  <span>Статус</span>
                  <select className="field-select" value={drafts[tour.id]?.status || "draft"} onChange={(event) => updateDraft(tour.id, "status", event.target.value)}>
                    <option value="draft">Черновик</option>
                    <option value="published">Опубликован</option>
                    <option value="archived">Архив</option>
                  </select>
                </label>
                <label className="field">
                  <span>Краткое описание</span>
                  <textarea className="field-textarea" value={drafts[tour.id]?.short_description || ""} onChange={(event) => updateDraft(tour.id, "short_description", event.target.value)} />
                </label>
                <label className="field">
                  <span>Подробное описание</span>
                  <textarea className="field-textarea" value={drafts[tour.id]?.full_description || ""} onChange={(event) => updateDraft(tour.id, "full_description", event.target.value)} />
                </label>
                <label className="field">
                  <span>Для кого</span>
                  <textarea className="field-textarea" value={drafts[tour.id]?.audience_description || ""} onChange={(event) => updateDraft(tour.id, "audience_description", event.target.value)} />
                </label>
                <label className="field">
                  <span>Ссылка на обложку</span>
                  <input value={drafts[tour.id]?.cover_image_url || ""} onChange={(event) => updateDraft(tour.id, "cover_image_url", event.target.value)} />
                </label>
                <label className="field">
                  <span>Ссылки на фотографии</span>
                  <textarea
                    className="field-textarea"
                    value={drafts[tour.id]?.gallery_text || ""}
                    onChange={(event) => updateDraft(tour.id, "gallery_text", event.target.value)}
                    placeholder="/tours/ei-kemerovo/01-monument.jpg&#10;/tours/ei-kemerovo/02-arrow.jpg"
                  />
                </label>
              </div>
            </article>
          ))}
        </section>
      </div>
    </BackofficeGate>
  )
}

export function AdminGuidesPage() {
  const { loading, hasRole } = useRequireRoles(["admin"])
  const [guides, setGuides] = useState<AdminGuideRecord[]>([])
  const [drafts, setDrafts] = useState<Record<number, {
    display_name: string
    headline: string
    bio: string
    photo_url: string
    about_audio_url: string
    about_audio_stream_url: string
    about_audio_file_name: string
    website_url: string
    social_links: Array<{
      label: string
      url: string
    }>
    trust_points: string[]
    reward_percent: string
    is_public: boolean
  }>>({})
  const [imageBusyGuideId, setImageBusyGuideId] = useState<number | null>(null)
  const [audioBusyGuideId, setAudioBusyGuideId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const refresh = async () => {
    const payload = await loadAdminGuides()
    setGuides(payload.guides)
    setDrafts(Object.fromEntries(payload.guides.map((guide) => [
      guide.id,
      {
        display_name: guide.display_name,
        headline: guide.headline || "",
        bio: guide.bio || "",
        photo_url: guide.photo_url || "",
        about_audio_url: guide.about_audio_url || "",
        about_audio_stream_url: guide.about_audio_stream_url || "",
        about_audio_file_name: guide.about_audio_file_name || "",
        website_url: guide.website_url || "",
        social_links: Array.from({ length: 3 }, (_, index) => ({
          label: guide.social_links[index]?.label || "",
          url: guide.social_links[index]?.url || "",
        })),
        trust_points: Array.from({ length: 3 }, (_, index) => guide.trust_points[index] || ""),
        reward_percent: String(guide.reward_percent ?? 40),
        is_public: guide.is_public,
      },
    ])))
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить профили экскурсоводов.")
    })
  }, [hasRole])

  const handleVisibility = async (guideId: number, isPublic: boolean) => {
    setMessage("")
    setError("")

    try {
      await updateAdminGuide(guideId, { is_public: isPublic })
      setMessage("Видимость экскурсовода обновлена.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить профиль экскурсовода.")
    }
  }

  const updateDraft = (guideId: number, field: keyof typeof drafts[number], value: string | boolean) => {
    setDrafts((current) => ({
      ...current,
      [guideId]: {
        ...current[guideId],
        [field]: value,
      },
    }))
  }

  const updateDraftFields = (guideId: number, values: Partial<typeof drafts[number]>) => {
    setDrafts((current) => ({
      ...current,
      [guideId]: {
        ...current[guideId],
        ...values,
      },
    }))
  }

  const updateSocialLink = (guideId: number, index: number, field: "label" | "url", value: string) => {
    setDrafts((current) => ({
      ...current,
      [guideId]: {
        ...current[guideId],
        social_links: current[guideId].social_links.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }))
  }

  const updateTrustPoint = (guideId: number, index: number, value: string) => {
    setDrafts((current) => ({
      ...current,
      [guideId]: {
        ...current[guideId],
        trust_points: current[guideId].trust_points.map((item, itemIndex) =>
          itemIndex === index ? value : item,
        ),
      },
    }))
  }

  const handleAdminGuidePhotoUpload = async (guideId: number, file: File | null) => {
    if (!file) {
      return
    }

    setImageBusyGuideId(guideId)
    setMessage("")
    setError("")

    try {
      const payload = await uploadGuideImage(file, "guide-photo")
      updateDraft(guideId, "photo_url", payload.url)
      setMessage("Фото экскурсовода загружено. Нажмите «Сохранить», чтобы обновить публичный профиль.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить фото экскурсовода.")
    } finally {
      setImageBusyGuideId(null)
    }
  }

  const handleAdminGuideAudioUpload = async (guideId: number, file: File | null) => {
    if (!file) {
      return
    }

    setAudioBusyGuideId(guideId)
    setMessage("")
    setError("")

    try {
      const payload = await uploadGuideAudio(file)
      updateDraftFields(guideId, {
        about_audio_url: payload.audio_url,
        about_audio_file_name: payload.audio_file_name,
        about_audio_stream_url: "",
      })
      setMessage("Голосовая запись загружена. Нажмите «Сохранить», чтобы обновить публичный профиль.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить голосовую запись.")
    } finally {
      setAudioBusyGuideId(null)
    }
  }

  const handleSaveGuide = async (guideId: number) => {
    const draft = drafts[guideId]
    if (!draft) {
      return
    }

    setMessage("")
    setError("")

    try {
      await updateAdminGuide(guideId, {
        display_name: draft.display_name,
        headline: draft.headline.trim() || null,
        bio: draft.bio || null,
        photo_url: draft.photo_url || null,
        about_audio_url: draft.about_audio_url || null,
        about_audio_file_name: draft.about_audio_file_name || null,
        website_url: draft.website_url || null,
        social_links: draft.social_links
          .map((item) => ({
            label: item.label.trim(),
            url: item.url.trim(),
          }))
          .filter((item) => item.label || item.url),
        trust_points: draft.trust_points.map((item) => item.trim()).filter(Boolean),
        reward_percent: Number(draft.reward_percent || 40),
        is_public: draft.is_public,
      })
      setMessage("Профиль экскурсовода сохранён.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить профиль экскурсовода.")
    }
  }

  const normalizedSocialLinks = (items: Array<{ label: string, url: string }>) => items
    .map((item) => ({
      label: item.label.trim(),
      url: item.url.trim(),
    }))
    .filter((item) => item.label || item.url)

  const normalizedTrustPoints = (items: string[]) => items
    .map((item) => item.trim())
    .filter(Boolean)

  const hasUnsavedGuideChanges = (guide: AdminGuideRecord) => {
    const draft = drafts[guide.id]

    if (!draft) {
      return false
    }

    return draft.display_name !== guide.display_name
      || draft.headline.trim() !== (guide.headline || "")
      || draft.bio !== (guide.bio || "")
      || draft.photo_url !== (guide.photo_url || "")
      || draft.about_audio_url !== (guide.about_audio_url || "")
      || draft.about_audio_file_name !== (guide.about_audio_file_name || "")
      || draft.website_url !== (guide.website_url || "")
      || Number(draft.reward_percent || 40) !== Number(guide.reward_percent ?? 40)
      || draft.is_public !== guide.is_public
      || JSON.stringify(normalizedSocialLinks(draft.social_links)) !== JSON.stringify(normalizedSocialLinks(guide.social_links))
      || JSON.stringify(normalizedTrustPoints(draft.trust_points)) !== JSON.stringify(normalizedTrustPoints(guide.trust_points))
  }

  return (
    <BackofficeGate title="Экскурсоводы" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Админка</p>
          <h1>Профили экскурсоводов</h1>
          <p className="lede">Правки профиля, публикация и контроль связанного пользовательского аккаунта.</p>
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="order-history">
          {guides.map((guide) => (
            <article key={guide.id} className="panel order-row admin-guide-row">
              <aside className="admin-guide-summary">
                <div>
                  <strong>{guide.display_name}</strong>
                  <p>{guide.user?.email || "Без связанного пользователя"}</p>
                  <p>{guide.bio || "Биография пока не заполнена."}</p>
                </div>
                <label className="consent-item admin-guide-status">
                  <input
                    type="checkbox"
                    checked={drafts[guide.id]?.is_public || false}
                    onChange={(event) => updateDraft(guide.id, "is_public", event.target.checked)}
                  />
                  <span>
                    <b>Статус</b>
                    Публичный профиль
                  </span>
                </label>
                <div className="admin-guide-stat">
                  <strong>{guide.tours_count}</strong>
                  <p>туров</p>
                </div>
                <div className="admin-guide-actions">
                  <button type="button" className="mini-button admin-guide-action-publish" onClick={() => void handleVisibility(guide.id, true)}>
                    Опубликовать
                  </button>
                  <button type="button" className="mini-button admin-guide-action-hide" onClick={() => void handleVisibility(guide.id, false)}>
                    Скрыть с сайта
                  </button>
                  <button
                    type="button"
                    className={`mini-button admin-guide-action-save ${hasUnsavedGuideChanges(guide) ? "admin-guide-action-save-dirty" : ""}`}
                    onClick={() => void handleSaveGuide(guide.id)}
                  >
                    Сохранить изменения
                  </button>
                </div>
              </aside>
              <div className="stack-list admin-guide-editor">
                <label className="field">
                  <span>Имя на сайте</span>
                  <input value={drafts[guide.id]?.display_name || ""} onChange={(event) => updateDraft(guide.id, "display_name", event.target.value)} />
                </label>
                <label className="field">
                  <span>Короткая экспертная строка</span>
                  <input value={drafts[guide.id]?.headline || ""} onChange={(event) => updateDraft(guide.id, "headline", event.target.value)} />
                </label>
                <div className="field">
                  <span>Фото экскурсовода</span>
                  {drafts[guide.id]?.photo_url ? (
                    <div className="cover-upload-card">
                      {imagePreviewUrl(drafts[guide.id]?.photo_url) ? (
                        <img src={imagePreviewUrl(drafts[guide.id]?.photo_url) || undefined} alt="Фото экскурсовода" className="cover-upload-preview" />
                      ) : null}
                      <div className="cover-upload-body">
                        <strong>Фото загружено</strong>
                        <p>{displayUploadName(drafts[guide.id]?.photo_url)}</p>
                        <div className="inline-actions">
                          <label className="mini-button file-action-button">
                            Заменить
                            <input
                              className="visually-hidden-file"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={imageBusyGuideId === guide.id}
                              onChange={(event) => void handleAdminGuidePhotoUpload(guide.id, event.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button type="button" className="mini-button" onClick={() => updateDraft(guide.id, "photo_url", "")}>
                            Убрать
                          </button>
                        </div>
                        <small>{imageBusyGuideId === guide.id ? "Загружаем фото..." : "JPG, PNG или WebP до 8 МБ."}</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={imageBusyGuideId === guide.id}
                        onChange={(event) => void handleAdminGuidePhotoUpload(guide.id, event.target.files?.[0] ?? null)}
                      />
                      <small>{imageBusyGuideId === guide.id ? "Загружаем фото..." : "Загрузите портрет автора. JPG, PNG или WebP до 8 МБ."}</small>
                    </>
                  )}
                </div>
                <label className="field">
                  <span>О себе</span>
                  <textarea
                    className="field-textarea"
                    value={drafts[guide.id]?.bio || ""}
                    onChange={(event) => updateDraft(guide.id, "bio", event.target.value)}
                    placeholder="Коротко расскажите об опыте автора и о том, почему ему можно доверить знакомство с городом."
                  />
                </label>
                <div className="field">
                  <span>Аудио «О себе»</span>
                  {drafts[guide.id]?.about_audio_url ? (
                    <div className="cover-upload-card audio-upload-card">
                      <div className="cover-upload-body">
                        <strong>Голос автора загружен</strong>
                        <p>{drafts[guide.id]?.about_audio_file_name || "Аудиофайл загружен"}</p>
                        {drafts[guide.id]?.about_audio_stream_url ? (
                          <audio controls preload="none" className="audio-snippet-player">
                            <source src={drafts[guide.id]?.about_audio_stream_url} type="audio/mpeg" />
                          </audio>
                        ) : (
                          <small>После сохранения карточки появится предпросмотр записи.</small>
                        )}
                        <div className="inline-actions">
                          <label className="mini-button file-action-button">
                            Заменить
                            <input
                              className="visually-hidden-file"
                              type="file"
                              accept="audio/*"
                              disabled={audioBusyGuideId === guide.id}
                              onChange={(event) => void handleAdminGuideAudioUpload(guide.id, event.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => updateDraftFields(guide.id, { about_audio_url: "", about_audio_stream_url: "", about_audio_file_name: "" })}
                          >
                            Убрать
                          </button>
                        </div>
                        <small>{audioBusyGuideId === guide.id ? "Загружаем аудио..." : "MP3, WAV, OGG, MP4 или AAC до 64 МБ."}</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="audio/*"
                        disabled={audioBusyGuideId === guide.id}
                        onChange={(event) => void handleAdminGuideAudioUpload(guide.id, event.target.files?.[0] ?? null)}
                      />
                      <small>{audioBusyGuideId === guide.id ? "Загружаем аудио..." : "Загрузите короткую запись автора «О себе». MP3, WAV, OGG, MP4 или AAC до 64 МБ."}</small>
                    </>
                  )}
                </div>
                <label className="field">
                  <span>Сайт экскурсовода</span>
                  <input value={drafts[guide.id]?.website_url || ""} onChange={(event) => updateDraft(guide.id, "website_url", event.target.value)} />
                </label>
                <label className="field">
                  <span>Вознаграждение, %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={drafts[guide.id]?.reward_percent || "40"}
                    onChange={(event) => updateDraft(guide.id, "reward_percent", event.target.value)}
                  />
                </label>
                <div className="stack-list">
                  <strong>Соцсети</strong>
                  {drafts[guide.id]?.social_links.map((item, index) => (
                    <div key={`social-${guide.id}-${index}`} className="inline-field">
                      <label className="field">
                        <span>Название {index + 1}</span>
                        <input value={item.label} onChange={(event) => updateSocialLink(guide.id, index, "label", event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Ссылка {index + 1}</span>
                        <input value={item.url} onChange={(event) => updateSocialLink(guide.id, index, "url", event.target.value)} />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="stack-list">
                  <strong>Почему стоит слушать автора</strong>
                  {drafts[guide.id]?.trust_points.map((item, index) => (
                    <label key={`trust-${guide.id}-${index}`} className="field">
                      <span>Тезис {index + 1}</span>
                      <input value={item} onChange={(event) => updateTrustPoint(guide.id, index, event.target.value)} />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </BackofficeGate>
  )
}

export function GuideProfilePage() {
  const { loading, hasRole } = useRequireRoles(["guide"])
  const [guide, setGuide] = useState<GuideProfileRecord | null>(null)
  const [publicPreviewMode, setPublicPreviewMode] = useState<"mobile" | "desktop">("mobile")
  const [draft, setDraft] = useState({
    display_name: "",
    headline: "",
    bio: "",
    photo_url: "",
    about_audio_url: "",
    about_audio_stream_url: "",
    about_audio_file_name: "",
    website_url: "",
    social_links: Array.from({ length: 3 }, () => ({ label: "", url: "" })),
    trust_points: Array.from({ length: 3 }, () => ""),
  })
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [audioBusy, setAudioBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const publicGuideUrl = guide?.is_public ? `${PUBLIC_SITE_ORIGIN}/guides/${guide.slug}` : ""
  const publicGuidePreviewUrl = publicGuideUrl ? `${publicGuideUrl}?preview=backoffice` : ""

  const fillDraft = (nextGuide: GuideProfileRecord) => {
    setGuide(nextGuide)
    setDraft({
      display_name: nextGuide.display_name,
      headline: nextGuide.headline || "",
      bio: nextGuide.bio || "",
      photo_url: nextGuide.photo_url || "",
      about_audio_url: nextGuide.about_audio_url || "",
      about_audio_stream_url: nextGuide.about_audio_stream_url || "",
      about_audio_file_name: nextGuide.about_audio_file_name || "",
      website_url: nextGuide.website_url || "",
      social_links: Array.from({ length: 3 }, (_, index) => ({
        label: nextGuide.social_links[index]?.label || "",
        url: nextGuide.social_links[index]?.url || "",
      })),
      trust_points: Array.from({ length: 3 }, (_, index) => nextGuide.trust_points[index] || ""),
    })
  }

  const refresh = async () => {
    const payload = await loadGuideProfile()
    fillDraft(payload.guide)
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить карточку экскурсовода.")
    })
  }, [hasRole])

  const updateDraft = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateSocialLink = (index: number, field: "label" | "url", value: string) => {
    setDraft((current) => ({
      ...current,
      social_links: current.social_links.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const updateTrustPoint = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      trust_points: current.trust_points.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }))
  }

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    setImageBusy(true)
    setError("")
    setMessage("")

    try {
      const payload = await uploadGuideImage(file, "guide-photo")
      setDraft((current) => ({
        ...current,
        photo_url: payload.url,
      }))
      setMessage("Фото загружено. Нажмите «Сохранить карточку», чтобы обновить публичный профиль.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить фото экскурсовода.")
    } finally {
      setImageBusy(false)
    }
  }

  const handleAboutAudioUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    setAudioBusy(true)
    setError("")
    setMessage("")

    try {
      const payload = await uploadGuideAudio(file)
      setDraft((current) => ({
        ...current,
        about_audio_url: payload.audio_url,
        about_audio_file_name: payload.audio_file_name,
        about_audio_stream_url: "",
      }))
      setMessage("Голосовая запись загружена. Нажмите «Сохранить карточку», чтобы обновить публичный профиль.")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить голосовую запись.")
    } finally {
      setAudioBusy(false)
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")

    try {
      const payload = await updateGuideProfile({
        display_name: draft.display_name.trim(),
        headline: draft.headline.trim() || null,
        bio: draft.bio.trim() || null,
        photo_url: draft.photo_url.trim() || null,
        about_audio_url: draft.about_audio_url.trim() || null,
        about_audio_file_name: draft.about_audio_file_name.trim() || null,
        website_url: draft.website_url.trim() || null,
        social_links: draft.social_links
          .map((item) => ({
            label: item.label.trim(),
            url: item.url.trim(),
          }))
          .filter((item) => item.label || item.url),
        trust_points: draft.trust_points.map((item) => item.trim()).filter(Boolean),
      })
      fillDraft(payload.guide)
      setMessage(payload.message)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить карточку экскурсовода.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <BackofficeGate title="Карточка экскурсовода" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Экскурсовод</p>
          <h1>Моя карточка</h1>
          <p className="lede">
            Здесь заполняется публичный профиль автора: фото, раздел «О себе», сайт и соцсети. Эти данные показываются на странице экскурсовода и в карточках маршрутов.
          </p>
          {guide ? (
            <div className="stack-actions">
              {guide.is_public ? (
                <a
                  href={`${PUBLIC_SITE_ORIGIN}/guides/${guide.slug}`}
                  className="button button-secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть публичную страницу
                </a>
              ) : (
                <span className="mini-link" aria-disabled="true">
                  Публичная страница пока скрыта. Публикацию включает администратор.
                </span>
              )}
            </div>
          ) : null}
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="checkout-grid guide-profile-grid">
          <article className="panel checkout-form-card">
            <h3>Публичные данные</h3>
            <form className="checkout-form" onSubmit={handleSave}>
              <label className="field">
                <span>Имя на сайте</span>
                <input value={draft.display_name} onChange={(event) => updateDraft("display_name", event.target.value)} />
              </label>
              <label className="field">
                <span>Короткая строка</span>
                <input
                  value={draft.headline}
                  onChange={(event) => updateDraft("headline", event.target.value)}
                  placeholder="Например, краевед и автор городских маршрутов"
                />
              </label>
              <label className="field">
                <span>Фото экскурсовода</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={imageBusy}
                  onChange={(event) => void handlePhotoUpload(event.target.files?.[0] ?? null)}
                />
                <small>{imageBusy ? "Загружаем фото..." : draft.photo_url ? "Фото загружено и видно в предпросмотре." : "Загрузите портрет автора. JPG, PNG или WebP до 8 МБ."}</small>
              </label>
              <label className="field">
                <span>О себе</span>
                <textarea
                  className="field-textarea"
                  value={draft.bio}
                  onChange={(event) => updateDraft("bio", event.target.value)}
                  placeholder="Расскажите, почему вам можно доверить знакомство с городом."
                />
              </label>
              <div className="field">
                <span>Аудио «О себе»</span>
                {draft.about_audio_url ? (
                  <div className="cover-upload-card audio-upload-card">
                    <div className="cover-upload-body">
                      <strong>Голос автора загружен</strong>
                      <p>{draft.about_audio_file_name || "Аудиофайл загружен"}</p>
                      {draft.about_audio_stream_url ? (
                        <audio controls preload="none" className="audio-snippet-player">
                          <source src={draft.about_audio_stream_url} type="audio/mpeg" />
                        </audio>
                      ) : (
                        <small>После сохранения карточки появится предпросмотр записи.</small>
                      )}
                      <div className="inline-actions">
                        <label className="mini-button file-action-button">
                          Заменить
                          <input
                            className="visually-hidden-file"
                            type="file"
                            accept="audio/*"
                            disabled={audioBusy}
                            onChange={(event) => void handleAboutAudioUpload(event.target.files?.[0] ?? null)}
                          />
                        </label>
                        <button
                          type="button"
                          className="mini-button"
                          onClick={() => setDraft((current) => ({ ...current, about_audio_url: "", about_audio_stream_url: "", about_audio_file_name: "" }))}
                        >
                          Убрать
                        </button>
                      </div>
                      <small>{audioBusy ? "Загружаем аудио..." : "MP3, WAV, OGG, MP4 или AAC до 64 МБ."}</small>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="audio/*"
                      disabled={audioBusy}
                      onChange={(event) => void handleAboutAudioUpload(event.target.files?.[0] ?? null)}
                    />
                    <small>{audioBusy ? "Загружаем аудио..." : "Загрузите короткую запись автора «О себе». MP3, WAV, OGG, MP4 или AAC до 64 МБ."}</small>
                  </>
                )}
              </div>
              <label className="field">
                <span>Сайт экскурсовода</span>
                <input
                  value={draft.website_url}
                  onChange={(event) => updateDraft("website_url", event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <div className="stack-list">
                <strong>Соцсети</strong>
                {draft.social_links.map((item, index) => (
                  <div key={`guide-profile-social-${index}`} className="inline-field guide-profile-inline">
                    <label className="field">
                      <span>Название {index + 1}</span>
                      <input
                        value={item.label}
                        onChange={(event) => updateSocialLink(index, "label", event.target.value)}
                        placeholder={index === 0 ? "Telegram" : "VK"}
                      />
                    </label>
                    <label className="field">
                      <span>Ссылка {index + 1}</span>
                      <input
                        value={item.url}
                        onChange={(event) => updateSocialLink(index, "url", event.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="stack-list">
                <strong>Почему стоит слушать автора</strong>
                {draft.trust_points.map((item, index) => (
                  <label key={`guide-profile-trust-${index}`} className="field">
                    <span>Тезис {index + 1}</span>
                    <input
                      value={item}
                      onChange={(event) => updateTrustPoint(index, event.target.value)}
                      placeholder={index === 0 ? "Знаю историю района из архивов и личных интервью" : ""}
                    />
                  </label>
                ))}
              </div>

              <button type="submit" className="button button-primary" disabled={busy || imageBusy || audioBusy}>
                {busy ? "Сохраняем..." : "Сохранить карточку"}
              </button>
            </form>
          </article>

          <aside className="panel checkout-info">
            <h3>Как это выглядит на сайте</h3>
            <div className="guide-profile-preview">
              {draft.photo_url ? (
                <img src={draft.photo_url} alt="" className="guide-profile-preview-photo" />
              ) : (
                <>
                  <div className="guide-avatar">Фото</div>
                  <small>Фото пока не загружено</small>
                </>
              )}
              <strong>{draft.display_name || "Имя экскурсовода"}</strong>
              <p>{draft.headline || "Короткая экспертная строка появится здесь."}</p>
              <p>{draft.bio || "Раздел «О себе» поможет посетителю понять опыт автора и выбрать маршрут."}</p>
              {draft.about_audio_url ? (
                <div className="audio-snippet">
                  <span className="audio-snippet-label">Прослушать голос автора</span>
                  {draft.about_audio_stream_url ? (
                    <audio controls preload="none" className="audio-snippet-player">
                      <source src={draft.about_audio_stream_url} type="audio/mpeg" />
                    </audio>
                  ) : (
                    <small>{draft.about_audio_file_name || "Аудиофайл будет доступен после сохранения."}</small>
                  )}
                </div>
              ) : null}
              <div className="stack-list">
                {draft.social_links
                  .filter((item) => item.label || item.url)
                  .map((item, index) => (
                    <span key={`guide-profile-preview-social-${index}`} className="mini-link">
                      {item.label || item.url}
                    </span>
                  ))}
              </div>
            </div>
          </aside>
        </section>

        {publicGuideUrl ? (
          <section className="panel public-preview-panel">
            <div className="public-preview-head">
              <div>
                <p className="eyebrow">Предпросмотр фронт-офиса</p>
                <h3>Как карточка выглядит для посетителя</h3>
              </div>
              <div className="public-preview-actions">
                <div className="public-preview-toggle" role="group" aria-label="Режим предпросмотра">
                  <button
                    type="button"
                    className={`mini-button${publicPreviewMode === "mobile" ? " mini-button-active" : ""}`}
                    onClick={() => setPublicPreviewMode("mobile")}
                  >
                    Мобильная версия
                  </button>
                  <button
                    type="button"
                    className={`mini-button${publicPreviewMode === "desktop" ? " mini-button-active" : ""}`}
                    onClick={() => setPublicPreviewMode("desktop")}
                  >
                    Десктоп
                  </button>
                </div>
                <a href={publicGuideUrl} className="mini-link" target="_blank" rel="noreferrer">
                  Открыть на сайте
                </a>
              </div>
            </div>
            <div className={`public-preview-stage public-preview-stage-${publicPreviewMode}`}>
              <iframe
                title="Публичная карточка экскурсовода"
                src={publicGuidePreviewUrl}
                className="public-preview-frame"
              />
            </div>
          </section>
        ) : null}
      </div>
    </BackofficeGate>
  )
}

export function AdminContactsPage() {
  const { loading, hasRole } = useRequireRoles(["admin", "accountant"])
  const [requests, setRequests] = useState<AdminContactRequest[]>([])
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const refresh = async () => {
    const payload = await loadAdminContactRequests()
    setRequests(payload.contact_requests)
  }

  useEffect(() => {
    if (!hasRole) {
      return
    }

    void refresh().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить обращения.")
    })
  }, [hasRole])

  const handleStatus = async (requestId: number, status: "new" | "in_progress" | "closed") => {
    setMessage("")
    setError("")

    try {
      await updateAdminContactRequest(requestId, status)
      setMessage("Статус обращения обновлён.")
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить обращение.")
    }
  }

  return (
    <BackofficeGate title="Обращения" allowed={hasRole} loading={loading}>
      <div className="page section-page">
        <section className="panel page-intro">
          <p className="eyebrow">Кабинет</p>
          <h1>Претензии и заявки</h1>
          <p className="lede">Единый реестр клиентских обращений, претензий и заявок новых экскурсоводов.</p>
        </section>

        {message ? <section className="panel empty-state form-success">{message}</section> : null}
        {error ? <section className="panel empty-state error-state">{error}</section> : null}

        <section className="order-history">
          {requests.map((request) => (
            <article key={request.id} className="panel order-row">
              <div>
                <strong>{contactRequestTypeLabel(request.type)}</strong>
                <p>{request.name || "Без имени"} · {request.email || "Без почты"}</p>
                <p>{request.message}</p>
              </div>
              <div>
                <strong>{contactRequestStatusLabel(request.status)}</strong>
                <p>{formatDateTime(request.created_at)}</p>
              </div>
              <div>
                <strong>{request.phone || "—"}</strong>
                <p>Контактный телефон</p>
              </div>
              <div className="stack-list">
                <button className="mini-button" onClick={() => void handleStatus(request.id, "new")}>
                  Новое
                </button>
                <button className="mini-button" onClick={() => void handleStatus(request.id, "in_progress")}>
                  В работе
                </button>
                <button className="mini-button" onClick={() => void handleStatus(request.id, "closed")}>
                  Закрыть
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </BackofficeGate>
  )
}
