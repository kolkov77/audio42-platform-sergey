import { fetchApi } from "./auth"
import type { LocaleCode } from "./i18n"

export type TranslationPayload = Partial<Record<Exclude<LocaleCode, "ru">, Record<string, string | string[]>>>

type AdminReportFilters = {
  tour_id?: number | null
  guide_id?: number | null
  date_from?: string
  date_to?: string
  interval?: "day" | "month"
  page_path?: string | null
}

type GuideReportFilters = {
  tour_id?: number | null
  date_from?: string
  date_to?: string
}

function withQuery(path: string, filters?: AdminReportFilters) {
  const params = new URLSearchParams()

  if (filters?.tour_id) params.set("tour_id", String(filters.tour_id))
  if (filters?.guide_id) params.set("guide_id", String(filters.guide_id))
  if (filters?.date_from) params.set("date_from", filters.date_from)
  if (filters?.date_to) params.set("date_to", filters.date_to)
  if (filters?.interval) params.set("interval", filters.interval)
  if (filters?.page_path) params.set("page_path", filters.page_path)

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export type AdminDashboard = {
  viewer: {
    id: number
    name: string
    email: string
    roles: Array<{
      id: number
      slug: string
      name: string
    }>
  }
  summary: {
    sales_rub: number
    orders_paid_count: number
    users_count: number
    guides_count: number
    published_tours_count: number
    promo_codes_active_count: number
    contact_requests_new_count: number
    visits_count: number
    entry_points_count: number
  }
  notes: {
    traffic_analytics: string
    top_entry_sources: Array<{
      label: string
      hits: number
    }>
    top_landing_pages: Array<{
      path: string
      hits: number
    }>
  }
}

export type AdminSalesRow = {
  order_number: string | null
  order_status: string | null
  paid_at: string | null
  tour_id: number
  tour_title: string | null
  guide_id: number | null
  guide_name: string | null
  unit_price_rub: number
  discount_rub: number
  final_price_rub: number
  payment_status: string | null
}

export type AdminDynamics = {
  filters: {
    tour_id: number | null
    guide_id: number | null
    date_from: string
    date_to: string
  }
  rows: Array<{
    date: string
    orders_count: number
    sales_rub: number
    visits_count: number
    entry_points_count: number
  }>
  top_entry_sources: Array<{
    label: string
    hits: number
  }>
}

export type AdminTrafficStats = {
  filters: {
    date_from: string
    date_to: string
    interval: "day" | "month"
    page_path: string | null
  }
  summary: {
    views_count: number
    sessions_count: number
    visitors_count: number
    leads_count: number
    conversion_percent: number
    desktop_percent: number
    mobile_percent: number
    known_device_sessions_count: number
  }
  period_rows: Array<{
    period: string
    views_count: number
    sessions_count: number
    visitors_count: number
    desktop_percent: number
    mobile_percent: number
    leads_count: number
    conversion_percent: number
  }>
  top_pages: Array<{
    path: string
    views_count: number
    sessions_count: number
    visitors_count: number
  }>
  landing_pages: Array<{
    path: string
    entries_count: number
  }>
  entry_sources: Array<{
    label: string
    entries_count: number
  }>
  source_groups: Array<{
    label: string
    entries_count: number
    percent: number
  }>
  search_sources: Array<{
    label: string
    entries_count: number
    percent: number
  }>
  external_sites: Array<{
    label: string
    entries_count: number
    percent: number
  }>
  social_sources: Array<{
    label: string
    entries_count: number
    percent: number
  }>
  mail_sources: Array<{
    label: string
    entries_count: number
    percent: number
  }>
  top_countries: Array<{
    code: string | null
    label: string
    visitors_count: number
    percent: number
  }>
  top_cities: Array<{
    code: string | null
    label: string
    visitors_count: number
    percent: number
  }>
  utm_campaigns: Array<{
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
    views_count: number
    sessions_count: number
    entries_count: number
  }>
}

export type AdminSearchEngineStatus = {
  checked_at: string
  site: {
    origin: string
    homepage_url: string
    robots_url: string
    sitemap_url: string
    ready_for_submission: boolean
  }
  checks: Array<{
    key: string
    label: string
    url: string
    status: "ok" | "warning" | "error"
    detail: string
  }>
  engines: Array<{
    key: "google" | "yandex"
    name: string
    status: "verification_tag_detected" | "verification_pending"
    console_url: string
    verification_tag_name: string
    verification_tag_present: boolean
    verification_tag_preview: string | null
    note: string
  }>
}

export type AdminSettlements = {
  period: {
    from: string
    to: string
  }
  rows: Array<{
    guide_id: number
    guide_name: string
    sales_rub: number
    reward_percent: number
    reward_rub: number
    payouts_rub: number
    balance_rub: number
    eligible_for_withdrawal: boolean
    manual_payout_entries_pending: boolean
    payout_entries: Array<{
      id: number
      paid_on: string | null
      amount_rub: number
      comment: string | null
      recorded_by?: string | null
    }>
  }>
}

export type AdminPromoCode = {
  id: number
  name_internal: string
  code: string
  discount_type: string
  discount_value: number
  starts_at: string | null
  ends_at: string | null
  scope_type: string
  is_active: boolean
  tour_ids: number[]
  tours: Array<{
    id: number | null
    title: string | null
    slug: string | null
  }>
}

export type AdminAdBanner = {
  id: number
  name_internal: string
  page_key: "excursions" | "tour" | "guide"
  slot_key: "block_start" | "block_middle" | "block_end" | "after_intro" | "after_second_card" | "after_route" | "after_hero"
  image_url: string
  target_url: string
  alt_text: string | null
  is_active: boolean
  created_at: string | null
}

export type AdminUserRecord = {
  id: number
  name: string
  email: string
  status: string | null
  last_login_at: string | null
  roles: Array<{
    id: number
    slug: string
    name: string
  }>
  guide: {
    id: number
    slug: string
    display_name: string
    reward_percent: number
  } | null
}

export type AdminTourRecord = {
  id: number
  slug: string
  title: string
  short_description: string | null
  full_description: string | null
  audience_description: string | null
  duration_minutes: number | null
  price_rub: number
  cover_image_url: string | null
  gallery_image_urls: string[]
  translation_json: TranslationPayload
  enabled_locales: LocaleCode[]
  status: string
  published_at: string | null
  tour_points_count: number
  tracks_count: number
  guide: {
    id: number
    slug: string
    display_name: string
  } | null
}

export type AdminGuideRecord = {
  id: number
  slug: string
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_stream_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  social_links: Array<{
    label: string
    url: string
  }>
  trust_points: string[]
  reward_percent: number
  is_public: boolean
  tours_count: number
  user: {
    id: number
    name: string
    email: string
  } | null
}

export type GuideProfileRecord = {
  id: number
  slug: string
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_stream_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  social_links: Array<{
    label: string
    url: string
  }>
  trust_points: string[]
  is_public: boolean
}

export type AdminContactRequest = {
  id: number
  type: string
  name: string | null
  email: string | null
  phone: string | null
  message: string
  status: string
  created_at: string | null
}

export type AdminPointRecord = {
  id: number
  slug: string
  title: string
  description: string | null
  city: string | null
  address_text: string | null
  lat: number | null
  lng: number | null
  is_active: boolean
  tour_points_count: number
  created_at: string | null
}

export type GuideTourSummary = {
  id: number
  slug: string
  title: string
  short_description: string | null
  full_description: string | null
  audience_description: string | null
  duration_minutes: number | null
  price_rub: number
  status: string
  cover_image_url?: string | null
  gallery_image_urls?: string[]
  translation_json: TranslationPayload
  enabled_locales: LocaleCode[]
  tour_points_count: number
  tracks_count: number
  published_at: string | null
}

export type GuideTourPointRecord = {
  id: number
  sort_order: number
  title_override: string | null
  description_override: string | null
  gallery_image_urls: string[]
  gallery_captions: string[]
  gallery_items: Array<{
    image_url: string
    caption: string | null
  }>
  translation_json: TranslationPayload
  is_route_visible: boolean
  point: {
    id: number | null
    title: string | null
    address_text: string | null
    lat: number | null
    lng: number | null
  }
}

export type GuideTrackRecord = {
  id: number
  title: string
  description: string | null
  translation_json: TranslationPayload
  audio_url: string | null
  audio_file_name: string | null
  duration_seconds: number | null
  sort_order: number
  track_type: "main" | "bonus"
  is_demo: boolean
  is_published: boolean
  tour_point_id: number | null
  tour_point_title: string | null
}

export type GuideTourDetail = GuideTourSummary & {
  points: GuideTourPointRecord[]
  tracks: GuideTrackRecord[]
}

export type GuideDynamics = {
  guide_id: number
  date_from: string
  date_to: string
  rows: Array<{
    date: string
    orders_count: number
    sales_rub: number
    reward_rub: number
  }>
}

export type GuideSalesTable = {
  guide_id: number
  rows: Array<{
    order_number: string | null
    paid_at: string | null
    tour_id: number
    tour_title: string | null
    unit_price_rub: number
    discount_rub: number
    final_price_rub: number
  }>
}

export type GuideSettlements = {
  guide: {
    id: number
    display_name: string
  }
  period: {
    from: string
    to: string
  }
  statement: {
    sales_rub: number
    reward_percent: number
    reward_rub: number
    payouts_rub: number
    balance_rub: number
    withdrawal_threshold_rub: number
    eligible_for_withdrawal: boolean
    manual_payout_entries_pending: boolean
    payout_entries: Array<{
      id: number
      paid_on: string | null
      amount_rub: number
      comment: string | null
    }>
  }
}

export type GuidePointSearchRecord = {
  id: number
  title: string
  address_text: string | null
  lat: number | null
  lng: number | null
}

export type AdminUsersPayload = {
  users: AdminUserRecord[]
  roles: Array<{
    id: number
    slug: string
    name: string
  }>
}

export async function loadAdminDashboard() {
  return fetchApi<AdminDashboard>("/api/admin/dashboard/summary")
}

export async function loadAdminSalesTable(filters?: AdminReportFilters) {
  return fetchApi<{ filters: AdminDynamics["filters"]; rows: AdminSalesRow[] }>(withQuery("/api/admin/reports/sales-table", filters))
}

export async function loadAdminDynamics(filters?: AdminReportFilters) {
  return fetchApi<AdminDynamics>(withQuery("/api/admin/reports/dynamics", filters))
}

export async function loadAdminTrafficStats(filters?: Pick<AdminReportFilters, "date_from" | "date_to" | "interval" | "page_path">) {
  return fetchApi<AdminTrafficStats>(withQuery("/api/admin/traffic/summary", filters))
}

export async function loadAdminSearchEngineStatus() {
  return fetchApi<AdminSearchEngineStatus>("/api/admin/search-engines/status")
}

export async function loadAdminSettlements(filters?: Pick<AdminReportFilters, "guide_id" | "date_from" | "date_to">) {
  return fetchApi<AdminSettlements>(withQuery("/api/admin/reports/settlements", filters))
}

export async function createAdminPayout(payload: {
  guide_id: number
  paid_on: string
  amount_rub: number
  comment?: string
}) {
  return fetchApi<{
    message: string
    payout: {
      id: number
      guide_id: number
      paid_on: string | null
      amount_rub: number
      comment: string | null
    }
  }>("/api/admin/reports/payouts", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function refundAdminOrder(orderNumber: string) {
  return fetchApi<{
    message: string
    order: {
      order_number: string
      status: string
      payment_provider: string | null
      payment_status: string | null
      access_statuses: string[]
    }
  }>(`/api/admin/reports/orders/${orderNumber}/refund`, {
    method: "POST",
  })
}

export async function loadAdminPromoCodes() {
  return fetchApi<{ promo_codes: AdminPromoCode[] }>("/api/admin/promo-codes")
}

export async function createAdminPromoCode(payload: {
  name_internal: string
  code: string
  discount_type: "fixed" | "percent" | "fixed_price"
  discount_value: number
  scope_type: "all_tours" | "selected_tours"
  starts_at?: string | null
  ends_at?: string | null
  is_active?: boolean
  tour_ids?: number[]
}) {
  return fetchApi<{ message: string; promo_code: AdminPromoCode }>("/api/admin/promo-codes", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminPromoCode(promoCodeId: number, payload: Partial<{
  name_internal: string
  code: string
  discount_type: "fixed" | "percent" | "fixed_price"
  discount_value: number
  scope_type: "all_tours" | "selected_tours"
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  tour_ids: number[]
}>) {
  return fetchApi<{ message: string; promo_code: AdminPromoCode }>(`/api/admin/promo-codes/${promoCodeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function loadAdminAdBanners() {
  return fetchApi<{ ad_banners: AdminAdBanner[] }>("/api/admin/ad-banners")
}

export async function createAdminAdBanner(payload: {
  name_internal: string
  page_key: AdminAdBanner["page_key"]
  slot_key: AdminAdBanner["slot_key"]
  image_url: string
  target_url: string
  alt_text?: string | null
  is_active?: boolean
}) {
  return fetchApi<{ message: string; ad_banner: AdminAdBanner }>("/api/admin/ad-banners", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminAdBanner(adBannerId: number, payload: Partial<{
  name_internal: string
  page_key: AdminAdBanner["page_key"]
  slot_key: AdminAdBanner["slot_key"]
  image_url: string
  target_url: string
  alt_text: string | null
  is_active: boolean
}>) {
  return fetchApi<{ message: string; ad_banner: AdminAdBanner }>(`/api/admin/ad-banners/${adBannerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminAdBanner(adBannerId: number) {
  return fetchApi<{ message: string; ad_banner_id: number }>(`/api/admin/ad-banners/${adBannerId}`, {
    method: "DELETE",
  })
}

export async function loadAdminUsers() {
  return fetchApi<AdminUsersPayload>("/api/admin/users")
}

export async function loadAdminTours() {
  return fetchApi<{ tours: AdminTourRecord[] }>("/api/admin/tours")
}

export async function updateAdminTour(tourId: number, payload: Partial<{
  title: string
  short_description: string | null
  full_description: string | null
  audience_description: string | null
  duration_minutes: number | null
  price_rub: number
  cover_image_url: string | null
  gallery_json: string[]
  translation_json: TranslationPayload
  enabled_locales_json: LocaleCode[]
  status: "draft" | "published" | "archived"
}>) {
  return fetchApi<{ message: string; tour: AdminTourRecord }>(`/api/admin/tours/${tourId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminTour(tourId: number) {
  return fetchApi<{ message: string; action: "deleted" | "archived"; tour_id: number }>(`/api/admin/tours/${tourId}`, {
    method: "DELETE",
  })
}

export async function loadAdminGuides() {
  return fetchApi<{ guides: AdminGuideRecord[] }>("/api/admin/guides")
}

export async function updateAdminGuide(guideId: number, payload: Partial<{
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  social_links: Array<{
    label: string
    url: string
  }>
  trust_points: string[]
  is_public: boolean
  reward_percent: number
}>) {
  return fetchApi<{ message: string; guide: AdminGuideRecord }>(`/api/admin/guides/${guideId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function loadGuideProfile() {
  return fetchApi<{ guide: GuideProfileRecord }>("/api/guide/profile")
}

export async function updateGuideProfile(payload: Partial<{
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  social_links: Array<{
    label: string
    url: string
  }>
  trust_points: string[]
}>) {
  return fetchApi<{ message: string; guide: GuideProfileRecord }>("/api/guide/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function loadAdminContactRequests() {
  return fetchApi<{ contact_requests: AdminContactRequest[] }>("/api/admin/contact-requests")
}

export async function loadAdminPoints(query = "") {
  const params = new URLSearchParams()
  if (query.trim()) params.set("query", query.trim())
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return fetchApi<{ points: AdminPointRecord[] }>(`/api/admin/points${suffix}`)
}

export async function createAdminPoint(payload: {
  title: string
  description?: string | null
  city?: string | null
  address_text?: string | null
  lat: number
  lng: number
  is_active?: boolean
}) {
  return fetchApi<{ message: string; point: AdminPointRecord }>("/api/admin/points", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminPoint(pointId: number, payload: Partial<{
  title: string
  description: string | null
  city: string | null
  address_text: string | null
  lat: number
  lng: number
  is_active: boolean
}>) {
  return fetchApi<{ message: string; point: AdminPointRecord }>(`/api/admin/points/${pointId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminPoint(pointId: number) {
  return fetchApi<{ message: string; action: "deleted" | "disabled"; point_id: number }>(`/api/admin/points/${pointId}`, {
    method: "DELETE",
  })
}

export async function updateAdminContactRequest(contactRequestId: number, status: "new" | "in_progress" | "closed") {
  return fetchApi<{ message: string; contact_request: AdminContactRequest }>(`/api/admin/contact-requests/${contactRequestId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function createAdminUser(payload: {
  name: string
  email: string
  password: string
  status?: "active" | "disabled"
  role_slugs?: string[]
  guide_display_name?: string
  guide_slug?: string
  guide_reward_percent?: number
}) {
  return fetchApi<{ message: string; user: AdminUserRecord }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function syncAdminUserRoles(userId: number, roleSlugs: string[]) {
  return fetchApi<{ message: string; user: AdminUserRecord }>(`/api/admin/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ role_slugs: roleSlugs }),
  })
}

export async function loadGuideDashboardSummary() {
  return fetchApi<{
    guide: {
      id: number
      display_name: string
    }
    summary: {
      tours_count: number
      tracks_count: number
      sales_rub: number
      reward_rub: number
      reward_percent: number
      payouts_rub: number
      balance_rub: number
      withdrawal_threshold_rub: number
      eligible_for_withdrawal: boolean
    }
  }>("/api/guide/dashboard/summary")
}

export async function loadGuideDynamics(filters?: GuideReportFilters) {
  return fetchApi<GuideDynamics>(withQuery("/api/guide/reports/dynamics", filters))
}

export async function loadGuideSalesTable(filters?: GuideReportFilters) {
  return fetchApi<GuideSalesTable>(withQuery("/api/guide/reports/sales-table", filters))
}

export async function loadGuideSettlements(filters?: Pick<GuideReportFilters, "date_from" | "date_to">) {
  return fetchApi<GuideSettlements>(withQuery("/api/guide/reports/settlements", filters))
}

export async function loadGuideTours() {
  return fetchApi<{
    guide: {
      id: number
      display_name: string
    }
    tours: GuideTourSummary[]
  }>("/api/guide/tours")
}

export async function loadGuideTourDetail(tourId: number) {
  return fetchApi<{
    guide: {
      id: number
      display_name: string
    }
    tour: GuideTourDetail
  }>(`/api/guide/tours/${tourId}`)
}

export async function createGuideTour(payload: {
  title: string
  price_rub: number
  short_description?: string
  full_description?: string
  audience_description?: string
  duration_minutes?: number
  cover_image_url?: string
  gallery_json?: string[]
  translation_json?: TranslationPayload
  enabled_locales_json?: LocaleCode[]
}) {
  return fetchApi<{ message: string; tour: GuideTourSummary }>("/api/guide/tours", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateGuideTour(
  tourId: number,
  payload: Partial<{
    title: string
    short_description: string | null
    full_description: string | null
    audience_description: string | null
    duration_minutes: number | null
    price_rub: number
    cover_image_url: string | null
    gallery_json: string[]
    translation_json: TranslationPayload
    enabled_locales_json: LocaleCode[]
    status: "draft" | "published" | "archived"
  }>,
) {
  return fetchApi<{ message: string; tour: GuideTourSummary }>(`/api/guide/tours/${tourId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteGuideTour(tourId: number) {
  return fetchApi<{ message: string; action: "deleted" | "archived"; tour_id: number }>(`/api/guide/tours/${tourId}`, {
    method: "DELETE",
  })
}

export async function searchGuidePoints(query: string) {
  const params = new URLSearchParams()
  if (query.trim()) {
    params.set("query", query.trim())
  }
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return fetchApi<{ points: GuidePointSearchRecord[] }>(`/api/guide/points/search${suffix}`)
}

export async function createGuidePoint(
  tourId: number,
  payload: {
    point_id?: number
    title?: string
    description?: string
    address_text?: string
    lat?: number
    lng?: number
    sort_order?: number
    title_override?: string
    description_override?: string
    gallery_json?: string[]
    gallery_captions_json?: string[]
    translation_json?: TranslationPayload
    is_route_visible?: boolean
  },
) {
  return fetchApi<{ message: string; tour_point: GuideTourPointRecord }>(`/api/guide/tours/${tourId}/points`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateGuidePoint(
  tourId: number,
  tourPointId: number,
  payload: {
    title_override?: string | null
    description_override?: string | null
    title?: string | null
    description?: string | null
    address_text?: string | null
    lat?: number | null
    lng?: number | null
    gallery_json?: string[] | null
    gallery_captions_json?: string[] | null
    translation_json?: TranslationPayload
    sort_order?: number | null
    is_route_visible?: boolean
  },
) {
  return fetchApi<{ message: string; tour_point: GuideTourPointRecord }>(`/api/guide/tours/${tourId}/points/${tourPointId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function uploadGuideImage(file: File, scope: "tour-cover" | "point-gallery" | "guide-photo" | "ad-banner" | "gallery" = "gallery") {
  const body = new FormData()
  body.set("image", file)
  body.set("scope", scope)

  return fetchApi<{ message: string; url: string; path: string; scope: string }>("/api/guide/uploads/images", {
    method: "POST",
    body,
  })
}

export async function uploadGuideAudio(file: File) {
  const body = new FormData()
  body.set("audio_file", file)

  return fetchApi<{ message: string; audio_url: string; audio_file_name: string }>("/api/guide/uploads/audio", {
    method: "POST",
    body,
  })
}

export async function deleteGuidePoint(tourId: number, tourPointId: number) {
  return fetchApi<{ message: string }>(`/api/guide/tours/${tourId}/points/${tourPointId}`, {
    method: "DELETE",
  })
}

export async function createGuideTrack(tourId: number, payload: {
  tour_point_id?: number
  manual_point_title?: string
  description?: string
  audio_url?: string
  audio_file?: File | null
  duration_seconds?: number
  sort_order?: number
  track_type?: "main" | "bonus"
  is_demo?: boolean
  is_published?: boolean
  translation_json?: TranslationPayload
}) {
  const body = new FormData()

  if (payload.tour_point_id) body.set("tour_point_id", String(payload.tour_point_id))
  if (payload.manual_point_title) body.set("manual_point_title", payload.manual_point_title)
  if (payload.description) body.set("description", payload.description)
  if (payload.audio_url) body.set("audio_url", payload.audio_url)
  if (payload.audio_file) body.set("audio_file", payload.audio_file)
  if (payload.duration_seconds) body.set("duration_seconds", String(payload.duration_seconds))
  if (payload.sort_order) body.set("sort_order", String(payload.sort_order))
  if (payload.track_type) body.set("track_type", payload.track_type)
  if (payload.translation_json) body.set("translation_json", JSON.stringify(payload.translation_json))
  body.set("is_demo", payload.is_demo ? "1" : "0")
  body.set("is_published", payload.is_published ? "1" : "0")

  return fetchApi<{ message: string; track: GuideTrackRecord }>(`/api/guide/tours/${tourId}/tracks`, {
    method: "POST",
    body,
  })
}

export async function updateGuideTrack(tourId: number, trackId: number, payload: {
  tour_point_id?: number
  manual_point_title?: string
  description?: string
  audio_url?: string
  audio_file?: File | null
  duration_seconds?: number
  sort_order?: number
  track_type?: "main" | "bonus"
  is_demo?: boolean
  is_published?: boolean
  translation_json?: TranslationPayload
}) {
  const body = new FormData()

  if (payload.tour_point_id != null) body.set("tour_point_id", String(payload.tour_point_id))
  if (payload.manual_point_title != null) body.set("manual_point_title", payload.manual_point_title)
  if (payload.description != null) body.set("description", payload.description)
  if (payload.audio_url != null) body.set("audio_url", payload.audio_url)
  if (payload.audio_file) body.set("audio_file", payload.audio_file)
  if (payload.duration_seconds != null) body.set("duration_seconds", String(payload.duration_seconds))
  if (payload.sort_order != null) body.set("sort_order", String(payload.sort_order))
  if (payload.track_type != null) body.set("track_type", payload.track_type)
  if (payload.translation_json != null) body.set("translation_json", JSON.stringify(payload.translation_json))
  if (payload.is_demo != null) body.set("is_demo", payload.is_demo ? "1" : "0")
  if (payload.is_published != null) body.set("is_published", payload.is_published ? "1" : "0")
  body.set("_method", "PATCH")

  return fetchApi<{ message: string; track: GuideTrackRecord }>(`/api/guide/tours/${tourId}/tracks/${trackId}`, {
    method: "POST",
    body,
  })
}

export async function deleteGuideTrack(tourId: number, trackId: number) {
  return fetchApi<{ message: string }>(`/api/guide/tours/${tourId}/tracks/${trackId}`, {
    method: "DELETE",
  })
}
