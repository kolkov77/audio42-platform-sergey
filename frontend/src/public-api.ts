import { fetchApi, getSearchParam } from "./auth"
import { getCurrentLocale, localeSearchSuffix, type LocaleCode } from "./i18n"

export type TourRatingSummary = {
  average: number | null
  count: number
}

export type AdBanner = {
  id: number
  page_key: "excursions" | "tour" | "guide"
  slot_key: "block_start" | "block_middle" | "block_end" | "after_intro" | "after_second_card" | "after_route" | "after_hero"
  image_url: string
  target_url: string
  alt_text: string | null
}

export type TourSummary = {
  id: number
  slug: string
  title: string
  short_description: string | null
  duration_minutes: number | null
  price_rub: number
  cover_image_url: string | null
  gallery_image_urls: string[]
  enabled_locales: LocaleCode[]
  active_locale: LocaleCode
  rating: TourRatingSummary
  guide: {
    id: number | null
    slug: string | null
    display_name: string | null
    about_audio_url?: string | null
    about_audio_file_name?: string | null
  }
  demo_track: {
    id: number
    title: string
    description: string | null
    audio_url: string | null
  } | null
}

export type GuideSummary = {
  id: number
  slug: string
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  trust_points: string[]
  tours: Array<{
    id: number
    slug: string
    title: string
    short_description: string | null
    duration_minutes: number | null
    price_rub: number
    cover_image_url: string | null
    enabled_locales?: LocaleCode[]
    active_locale?: LocaleCode
    rating?: TourRatingSummary
  }>
}

export type GuideDetail = {
  id: number
  slug: string
  display_name: string
  headline: string | null
  bio: string | null
  photo_url: string | null
  about_audio_url: string | null
  about_audio_file_name: string | null
  website_url: string | null
  social_links: Array<string | Record<string, string>>
  trust_points: string[]
  viewer_accesses: Array<{
    tour_id: number
    tour_slug: string | null
    tour_title: string | null
    starts_at: string | null
    expires_at: string | null
    status: string
    is_active: boolean
  }>
  tours: Array<{
    id: number
    slug: string
    title: string
    short_description: string | null
    duration_minutes: number | null
    price_rub: number
    cover_image_url: string | null
    viewer_access: {
      tour_id: number
      tour_slug: string | null
      tour_title: string | null
      starts_at: string | null
      expires_at: string | null
      status: string
      is_active: boolean
    } | null
  }>
}

export type TourDetail = {
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
  enabled_locales: LocaleCode[]
  active_locale: LocaleCode
  rating: TourRatingSummary
  user_rating: number | null
  guide: {
    id: number | null
    slug: string | null
    display_name: string | null
    headline: string | null
    bio: string | null
    photo_url: string | null
    about_audio_url: string | null
    about_audio_file_name: string | null
    website_url: string | null
    social_links: Array<string | Record<string, string>>
    trust_points: string[]
  }
  viewer_access: {
    is_active: boolean
    status: string
    starts_at: string | null
    expires_at: string | null
  } | null
  points: Array<{
    id: number
    sort_order: number
    title: string | null
    description: string | null
    lat: number | null
    lng: number | null
    gallery_image_urls: string[]
    gallery_captions: string[]
    gallery_items: Array<{
      image_url: string
      caption: string | null
    }>
  }>
  tracks: Array<{
    id: number
    title: string
    description: string | null
    is_demo: boolean
    is_accessible: boolean
    sort_order: number
    track_type: "main" | "bonus"
    tour_point_id: number | null
    gallery_image_urls: string[]
    gallery_captions: string[]
    gallery_items: Array<{
      image_url: string
      caption: string | null
    }>
    audio_url: string | null
  }>
}

export type PublicMapPoint = {
  point_id: number
  title: string
  lat: number
  lng: number
  tours: Array<{
    id: number
    slug: string
    title: string
    guide_name: string | null
  }>
}

export type TourMapResponse = {
  tour: {
    id: number
    slug: string
    title: string
  }
  points: Array<{
    id: number
    title: string | null
    sort_order: number
    lat: number
    lng: number
  }>
  polyline: number[][]
}

export type CheckoutPreview = {
  tour: {
    id: number
    slug: string
    title: string
    price_rub: number
  }
  pricing: {
    subtotal_rub: number
    discount_rub: number
    total_rub: number
    promo_code_id: number | null
    promo_code: {
      id: number
      code: string
      discount_type: string
      discount_value: number
    } | null
  }
}

export type CheckoutOrderResponse = {
  message: string
  order_number: string
  payment_provider: string
  payment_confirmation_url?: string | null
  payment_status?: string | null
  configuration_missing?: boolean
}

export type CheckoutSuccess = {
  message: string
  order_number: string
  status: string
  tour: {
    id: number
    title: string
    slug: string | null
  } | null
  access: {
    starts_at: string | null
    expires_at: string | null
    status: string
  } | null
}

export type CheckoutOrderStatus = {
  order: {
    order_number: string
    status: string
    subtotal_rub: number
    discount_rub: number
    total_rub: number
    paid_at: string | null
    payment_provider: string | null
    items: Array<{
      tour_id: number
      title: string
      final_price_rub: number
    }>
    payments: Array<{
      provider_payment_id: string
      status: string | null
      paid_at: string | null
    }>
  }
}

export type ContactRequestPayload = {
  type: "feedback" | "claim" | "guide_application"
  name?: string
  email?: string
  phone?: string
  message: string
  accept_pdn: boolean
}

export type CabinetOverview = {
  profile: {
    id: number
    name: string
    email: string
    phone: string | null
    status: string | null
    email_verified: boolean
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
      is_public: boolean
    } | null
  }
  summary: {
    orders_count: number
    paid_orders_count: number
    active_access_count: number
    total_spent_rub: number
  }
  active_accesses: Array<{
    id: number
    status: string
    starts_at: string | null
    expires_at: string | null
    tour: {
      id: number
      slug: string
      title: string
      cover_image_url: string | null
      guide_name: string | null
    } | null
    order: {
      order_number: string
    } | null
  }>
  orders: Array<{
    id: number
    order_number: string
    status: string
    subtotal_rub: number
    discount_rub: number
    total_rub: number
    payment_provider: string | null
    payment_method: string | null
    created_at: string | null
    paid_at: string | null
    items: Array<{
      tour_id: number
      tour_slug: string | null
      title: string
      guide_name: string | null
      final_price_rub: number
    }>
    access: Array<{
      tour_id: number
      tour_slug: string | null
      tour_title: string | null
      starts_at: string | null
      expires_at: string | null
      status: string
    }>
  }>
}

export async function loadTours() {
  const data = await fetchApi<{ tours: TourSummary[] }>(`/api/public/tours${localeSearchSuffix()}`)
  return data?.tours ?? []
}

export async function loadAdBanners(pageKey: AdBanner["page_key"]) {
  const data = await fetchApi<{ ad_banners: AdBanner[] }>(`/api/public/ad-banners?page=${pageKey}`)
  return data?.ad_banners ?? []
}

export async function loadTour(slug: string) {
  const data = await fetchApi<{ tour: TourDetail }>(`/api/public/tours/${slug}${localeSearchSuffix()}`)
  return data?.tour ?? null
}

export async function loadMapPoints() {
  const data = await fetchApi<{ points: PublicMapPoint[] }>(`/api/public/map/points${localeSearchSuffix()}`)
  return data?.points ?? []
}

export async function loadGuides() {
  const data = await fetchApi<{ guides: GuideSummary[] }>(`/api/public/guides${localeSearchSuffix()}`)
  return data?.guides ?? []
}

export async function loadGuide(slug: string) {
  const data = await fetchApi<{ guide: GuideDetail }>(`/api/public/guides/${slug}${localeSearchSuffix()}`)
  return data?.guide ?? null
}

export async function loadTourMap(slug: string) {
  return fetchApi<TourMapResponse>(`/api/public/tours/${slug}/map${localeSearchSuffix()}`)
}

export async function submitTourRating(slug: string, rating: number) {
  return fetchApi<{
    message: string
    user_rating: number
    rating: TourRatingSummary
  }>(`/api/public/tours/${slug}/rating`, {
    method: "POST",
    body: JSON.stringify({
      rating,
      locale: getCurrentLocale(),
    }),
  })
}

export async function previewCheckout(payload: {
  tour_id: number
  promo_code?: string
  email?: string
}) {
  return fetchApi<CheckoutPreview>("/api/checkout/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function createCheckoutOrder(payload: {
  tour_id: number
  promo_code?: string
  email: string
  name?: string
  accept_offer: boolean
  accept_pdn: boolean
}) {
  return fetchApi<CheckoutOrderResponse>("/api/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function loadCheckoutSuccess(orderNumber: string) {
  const query = new URLSearchParams({ order_number: orderNumber }).toString()
  return fetchApi<CheckoutSuccess>(`/api/checkout/success?${query}`)
}

export async function loadCheckoutOrderStatus(orderNumber: string) {
  return fetchApi<CheckoutOrderStatus>(`/api/checkout/orders/${orderNumber}`)
}

export async function submitContactRequest(payload: ContactRequestPayload) {
  return fetchApi<{ message: string }>("/api/public/contact-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function loadCabinetOverview() {
  return fetchApi<CabinetOverview>("/api/cabinet/overview")
}

export function getSelectedTourSlug() {
  return getSearchParam("tour")
}
