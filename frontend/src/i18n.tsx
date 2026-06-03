import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { applyStaticPageTranslations } from "./static-translations"

export type LocaleCode = "ru" | "en" | "zh" | "de" | "fr"

export const SUPPORTED_LOCALES: Array<{ code: LocaleCode; label: string; shortLabel: string; htmlLang: string }> = [
  { code: "ru", label: "Русский", shortLabel: "RU", htmlLang: "ru" },
  { code: "en", label: "English", shortLabel: "EN", htmlLang: "en" },
  { code: "zh", label: "中文", shortLabel: "中文", htmlLang: "zh-CN" },
  { code: "de", label: "Deutsch", shortLabel: "DE", htmlLang: "de" },
  { code: "fr", label: "Français", shortLabel: "FR", htmlLang: "fr" },
]

const LOCALE_STORAGE_KEY = "audio42-locale"

type TranslationKey =
  | "brandCaption"
  | "navAbout"
  | "navExcursions"
  | "navGuides"
  | "navMap"
  | "navTerms"
  | "navContacts"
  | "login"
  | "register"
  | "cabinet"
  | "footerTitle"
  | "footerCopy"
  | "footerNavigation"
  | "footerDocs"
  | "footerContacts"
  | "footerCity"
  | "footerOffer"
  | "footerPrivacy"
  | "footerConsent"
  | "footerPaymentPolicy"
  | "privacyNoticeTitle"
  | "privacyNoticeBody"
  | "privacyNoticePrivacyLink"
  | "privacyNoticeAnd"
  | "privacyNoticeConsentLink"
  | "privacyNoticeAccept"
  | "privacyNoticeAria"
  | "themeDark"
  | "themeLight"
  | "catalogTitle"
  | "catalogLead"
  | "catalogLoading"
  | "catalogError"
  | "route"
  | "guide"
  | "duration"
  | "price"
  | "listenAuthor"
  | "demoSoon"
  | "openTour"
  | "buyAccess"
  | "tourPage"
  | "forWhom"
  | "allGuides"
  | "routeTracks"
  | "bonusTracks"
  | "bonusTracksLead"
  | "freeTracks"
  | "rating"
  | "rateTour"
  | "ratingSaved"
  | "noRatings"
  | "siteLanguage"

const translations: Partial<Record<LocaleCode, Partial<Record<TranslationKey, string>>>> = {
  ru: {
    brandCaption: "по Кемерово",
    navAbout: "О проекте",
    navExcursions: "Экскурсии",
    navGuides: "Экскурсоводы",
    navMap: "Карта",
    navTerms: "Условия и оплата",
    navContacts: "Контакты",
    login: "Вход",
    register: "Создать кабинет",
    cabinet: "Кабинет",
    footerTitle: "Аудиогиды по Кемерово",
    footerCopy: "Платформа с авторскими маршрутами, картой города и доступом к экскурсиям в удобном темпе.",
    footerNavigation: "Навигация",
    footerDocs: "Покупка и документы",
    footerContacts: "Контакты",
    footerCity: "Кемерово",
    footerOffer: "Оферта",
    footerPrivacy: "Политика ПДн",
    footerConsent: "Согласие на ПДн",
    footerPaymentPolicy: "Оплата и возвраты",
    privacyNoticeTitle: "Сайт использует технические данные",
    privacyNoticeBody: "Мы обрабатываем cookies, локальные идентификаторы браузера и внутреннюю аналитику для работы сайта, безопасности и улучшения маршрутов. Подробности есть в",
    privacyNoticePrivacyLink: "политике ПДн",
    privacyNoticeAnd: "и",
    privacyNoticeConsentLink: "согласии на обработку ПДн",
    privacyNoticeAccept: "Понятно",
    privacyNoticeAria: "Уведомление об обработке персональных данных",
    themeDark: "Тёмный вид",
    themeLight: "Светлый вид",
    catalogTitle: "Кемерово - город с характером.",
    catalogLead: "Выберите маршрут, познакомьтесь с голосом экскурсовода и откройте прогулку по Кемерово в удобном темпе.",
    catalogLoading: "Загружаем каталог экскурсий...",
    catalogError: "Не удалось загрузить каталог.",
    route: "Маршрут",
    guide: "Рассказывает",
    duration: "Продолжительность",
    price: "Стоимость",
    listenAuthor: "Послушать голос автора",
    demoSoon: "Запись автора появится в карточке экскурсовода.",
    openTour: "Открыть",
    buyAccess: "Купить доступ",
    tourPage: "Страница тура",
    forWhom: "Для кого",
    allGuides: "Все экскурсоводы",
    routeTracks: "Маршрут прогулки",
    bonusTracks: "Бонусные треки",
    bonusTracksLead: "Дополнительные аудиоматериалы к экскурсии",
    freeTracks: "Первые 3 трека доступны бесплатно",
    rating: "Рейтинг",
    rateTour: "Было интересно?",
    ratingSaved: "Оценка сохранена.",
    noRatings: "Пока нет оценок",
    siteLanguage: "Язык сайта",
  },
  en: {
    brandCaption: "in Kemerovo",
    navAbout: "About",
    navExcursions: "Tours",
    navGuides: "Guides",
    navMap: "Map",
    navTerms: "Terms & payment",
    navContacts: "Contacts",
    login: "Sign in",
    register: "Create account",
    cabinet: "Account",
    footerTitle: "Audio tours in Kemerovo",
    footerCopy: "A platform for author-led routes, a city map, and time-limited access to audio tours.",
    footerNavigation: "Navigation",
    footerDocs: "Purchase & documents",
    footerContacts: "Contacts",
    footerCity: "Kemerovo",
    footerOffer: "Offer",
    footerPrivacy: "Privacy policy",
    footerConsent: "Personal data consent",
    footerPaymentPolicy: "Payments & refunds",
    privacyNoticeTitle: "This site uses technical data",
    privacyNoticeBody: "We process cookies/localStorage identifiers and first-party analytics to run the site, keep it secure, and improve routes. Details are available in the",
    privacyNoticePrivacyLink: "privacy policy",
    privacyNoticeAnd: "and",
    privacyNoticeConsentLink: "personal data consent",
    privacyNoticeAccept: "Got it",
    privacyNoticeAria: "Personal data processing notice",
    themeDark: "Dark view",
    themeLight: "Light view",
    catalogTitle: "Tour catalog",
    catalogLead: "Choose a route, hear the guide's voice, and explore Kemerovo at your own pace.",
    catalogLoading: "Loading tours...",
    catalogError: "Could not load the catalog.",
    route: "Route",
    guide: "Guide",
    duration: "Duration",
    price: "Price",
    listenAuthor: "Listen to the guide",
    demoSoon: "The author's recording will appear in the guide profile.",
    openTour: "Open tour",
    buyAccess: "Buy access",
    tourPage: "Tour page",
    forWhom: "Best for",
    allGuides: "All guides",
    routeTracks: "Tour route",
    bonusTracks: "Bonus tracks",
    bonusTracksLead: "Additional audio materials for this tour",
    freeTracks: "The first 3 tracks are free",
    rating: "Rating",
    rateTour: "Rate this tour",
    ratingSaved: "Rating saved.",
    noRatings: "No ratings yet",
    siteLanguage: "Site language",
  },
  zh: {
    brandCaption: "克麦罗沃",
    navAbout: "项目",
    navExcursions: "游览",
    navGuides: "讲解员",
    navMap: "地图",
    navTerms: "购买与付款",
    navContacts: "联系方式",
    login: "登录",
    register: "创建账户",
    cabinet: "个人中心",
    footerTitle: "克麦罗沃语音导览",
    footerCopy: "作者路线、城市地图与限时语音游览访问的平台。",
    footerNavigation: "导航",
    footerDocs: "购买与文件",
    footerContacts: "联系方式",
    footerCity: "克麦罗沃",
    footerOffer: "要约",
    footerPrivacy: "隐私政策",
    footerConsent: "个人数据同意书",
    footerPaymentPolicy: "付款与退款",
    privacyNoticeTitle: "本网站使用技术数据",
    privacyNoticeBody: "我们会处理 cookies/localStorage 标识符和第一方分析数据，用于网站运行、安全保障和路线改进。详情见",
    privacyNoticePrivacyLink: "隐私政策",
    privacyNoticeAnd: "和",
    privacyNoticeConsentLink: "个人数据处理同意书",
    privacyNoticeAccept: "明白",
    privacyNoticeAria: "个人数据处理通知",
    themeDark: "深色",
    themeLight: "浅色",
    catalogTitle: "游览目录",
    catalogLead: "选择路线，先听讲解员的声音，再按自己的节奏探索克麦罗沃。",
    catalogLoading: "正在加载游览...",
    catalogError: "无法加载目录。",
    route: "路线",
    guide: "讲解员",
    duration: "时长",
    price: "价格",
    listenAuthor: "试听讲解员",
    demoSoon: "作者录音会显示在讲解员资料中。",
    openTour: "打开游览",
    buyAccess: "购买访问",
    tourPage: "游览页面",
    forWhom: "适合人群",
    allGuides: "所有讲解员",
    routeTracks: "游览路线",
    bonusTracks: "附加音频",
    bonusTracksLead: "本次导览的补充音频材料",
    freeTracks: "前 3 段音频免费",
    rating: "评分",
    rateTour: "评价游览",
    ratingSaved: "评分已保存。",
    noRatings: "暂无评分",
    siteLanguage: "网站语言",
  },
  de: {
    brandCaption: "in Kemerowo",
    navAbout: "Über uns",
    navExcursions: "Touren",
    navGuides: "Guides",
    navMap: "Karte",
    navTerms: "Kauf & Zahlung",
    navContacts: "Kontakt",
    login: "Anmelden",
    register: "Konto erstellen",
    cabinet: "Konto",
    footerTitle: "Audioguides in Kemerowo",
    footerCopy: "Eine Plattform mit Autorenrouten, Stadtkarte und zeitlich begrenztem Zugang zu Audiotouren.",
    footerNavigation: "Navigation",
    footerDocs: "Kauf & Dokumente",
    footerContacts: "Kontakt",
    footerCity: "Kemerowo",
    footerOffer: "Angebot",
    footerPrivacy: "Datenschutz",
    footerConsent: "Einwilligung zur Datenverarbeitung",
    footerPaymentPolicy: "Zahlung & Erstattung",
    privacyNoticeTitle: "Diese Website nutzt technische Daten",
    privacyNoticeBody: "Wir verarbeiten cookies/localStorage identifiers und First-party-Analytics, damit die Website funktioniert, sicher bleibt und Routen verbessert werden. Details stehen in der",
    privacyNoticePrivacyLink: "Datenschutzerklärung",
    privacyNoticeAnd: "und",
    privacyNoticeConsentLink: "Einwilligung zur Datenverarbeitung",
    privacyNoticeAccept: "Verstanden",
    privacyNoticeAria: "Hinweis zur Verarbeitung personenbezogener Daten",
    themeDark: "Dunkel",
    themeLight: "Hell",
    catalogTitle: "Tourenkatalog",
    catalogLead: "Wählen Sie eine Route, hören Sie die Stimme des Guides und entdecken Sie Kemerowo im eigenen Tempo.",
    catalogLoading: "Touren werden geladen...",
    catalogError: "Katalog konnte nicht geladen werden.",
    route: "Route",
    guide: "Guide",
    duration: "Dauer",
    price: "Preis",
    listenAuthor: "Guide anhören",
    demoSoon: "Die Aufnahme des Autors erscheint im Guide-Profil.",
    openTour: "Tour öffnen",
    buyAccess: "Zugang kaufen",
    tourPage: "Tourseite",
    forWhom: "Geeignet für",
    allGuides: "Alle Guides",
    routeTracks: "Tourroute",
    bonusTracks: "Bonus-Tracks",
    bonusTracksLead: "Zusätzliche Audiomaterialien zu dieser Tour",
    freeTracks: "Die ersten 3 Tracks sind kostenlos",
    rating: "Bewertung",
    rateTour: "Tour bewerten",
    ratingSaved: "Bewertung gespeichert.",
    noRatings: "Noch keine Bewertungen",
    siteLanguage: "Seitensprache",
  },
  fr: {
    brandCaption: "à Kemerovo",
    navAbout: "À propos",
    navExcursions: "Balades",
    navGuides: "Auteurs",
    navMap: "Carte",
    navTerms: "Conditions et paiement",
    navContacts: "Contacts",
    login: "Connexion",
    register: "Créer un compte",
    cabinet: "Compte",
    footerTitle: "Audioguides à Kemerovo",
    footerCopy: "Une plateforme de balades audio d'auteur, avec carte de la ville et accès limité dans le temps.",
    footerNavigation: "Navigation",
    footerDocs: "Achat et documents",
    footerContacts: "Contacts",
    footerCity: "Kemerovo",
    footerOffer: "Offre",
    footerPrivacy: "Politique de confidentialité",
    footerConsent: "Consentement aux données personnelles",
    footerPaymentPolicy: "Paiement et remboursements",
    privacyNoticeTitle: "Ce site utilise des données techniques",
    privacyNoticeBody: "Nous traitons les cookies, les identifiants locaux du navigateur et les données d'analyse interne pour faire fonctionner le site, assurer sa sécurité et améliorer les itinéraires. Les détails se trouvent dans la",
    privacyNoticePrivacyLink: "politique de confidentialité",
    privacyNoticeAnd: "et le",
    privacyNoticeConsentLink: "consentement au traitement des données personnelles",
    privacyNoticeAccept: "Compris",
    privacyNoticeAria: "Information sur le traitement des données personnelles",
    themeDark: "Mode sombre",
    themeLight: "Mode clair",
    catalogTitle: "Kemerovo, une ville avec du caractère.",
    catalogLead: "Choisissez un itinéraire, écoutez la voix de l'auteur et découvrez Kemerovo à votre rythme.",
    catalogLoading: "Chargement du catalogue...",
    catalogError: "Impossible de charger le catalogue.",
    route: "Itinéraire",
    guide: "Raconté par",
    duration: "Durée",
    price: "Prix",
    listenAuthor: "Écouter la voix de l'auteur",
    demoSoon: "L'enregistrement de l'auteur apparaîtra dans son profil.",
    openTour: "Ouvrir",
    buyAccess: "Acheter l'accès",
    tourPage: "Page de la balade",
    forWhom: "Pour qui",
    allGuides: "Tous les auteurs",
    routeTracks: "Itinéraire de la balade",
    bonusTracks: "Pistes bonus",
    bonusTracksLead: "Documents audio supplémentaires pour cette balade",
    freeTracks: "Les 3 premières pistes sont gratuites",
    rating: "Note",
    rateTour: "C'était intéressant ?",
    ratingSaved: "Note enregistrée.",
    noRatings: "Pas encore de notes",
    siteLanguage: "Langue du site",
  },
}

type I18nContextValue = {
  locale: LocaleCode
  setLocale: (locale: LocaleCode) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function normalizeLocale(value: string | null | undefined): LocaleCode {
  const normalized = (value || "").toLowerCase()

  if (normalized === "zh-cn" || normalized === "zh_cn" || normalized === "cn") {
    return "zh"
  }

  return SUPPORTED_LOCALES.some((item) => item.code === normalized) ? (normalized as LocaleCode) : "ru"
}

export function getCurrentLocale(): LocaleCode {
  if (typeof window === "undefined") {
    return "ru"
  }

  const queryLocale = new URLSearchParams(window.location.search).get("locale")
  if (queryLocale) {
    return normalizeLocale(queryLocale)
  }

  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function localeSearchSuffix() {
  const locale = getCurrentLocale()
  return locale === "ru" ? "" : `?locale=${encodeURIComponent(locale)}`
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(getCurrentLocale)

  const setLocale = (nextLocale: LocaleCode) => {
    const normalized = normalizeLocale(nextLocale)
    setLocaleState(normalized)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    }
  }

  useEffect(() => {
    const meta = SUPPORTED_LOCALES.find((item) => item.code === locale)
    if (typeof document !== "undefined") {
      document.documentElement.lang = meta?.htmlLang ?? locale
      document.documentElement.dataset.locale = locale
    }
  }, [locale])

  useEffect(() => applyStaticPageTranslations(locale), [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => translations[locale]?.[key] ?? translations.ru?.[key] ?? key,
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("I18nContext is not available")
  }

  return context
}
