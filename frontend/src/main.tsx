import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router"
import { StrictMode, useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import {
  AdminAdBannersPage,
  AdminContactsPage,
  AdminFinancePage,
  AdminGuidesPage,
  AdminPointsPage,
  AdminPromoCodesPage,
  AdminSearchEnginePage,
  AdminTrafficPage,
  AdminToursPage,
  AdminUsersPage,
  BackofficeHomePage,
  GuideProfilePage,
  GuideStudioPage,
} from "./admin-pages"
import { AuthProvider, useAuth } from "./auth"
import {
  CabinetPage as AuthCabinetPage,
  ForgotPasswordPage as AuthForgotPasswordPage,
  LoginPage as AuthLoginPage,
  MagicLoginPage as AuthMagicLoginPage,
  RegisterPage as AuthRegisterPage,
  ResetPasswordPage as AuthResetPasswordPage,
} from "./auth-pages"
import {
  AboutPage,
  CheckoutFailPage,
  CheckoutSuccessPage,
  ContactsPage,
  ExcursionsPage,
  GuidePage,
  GuidesPage,
  MapPage,
  NotFoundPage,
  TermsPage,
  TourPage,
} from "./public-pages"
import {
  MERCHANT,
  PERSONAL_DATA_CONSENT_PATH,
  PaymentPolicyPage,
  PersonalDataConsentPage,
  OfferPage,
  PrivacyPage,
  SITE_NAME,
} from "./legal-pages"
import { trackPublicPageView } from "./analytics"
import { I18nProvider, SUPPORTED_LOCALES, useI18n } from "./i18n"
import { applySeo } from "./seo"
import { applyStaticPageTranslations } from "./static-translations"
import "./styles.css"

const queryClient = new QueryClient()
const BACKOFFICE_HOSTS = [
  "back.audio42.onff.ru",
  "cabinet.audio42.onff.ru",
  "back.audiogid42.ru",
  "cabinet.audiogid42.ru",
]
const isBackofficeHost =
  typeof window !== "undefined" &&
  BACKOFFICE_HOSTS.includes(window.location.hostname)
const THEME_STORAGE_KEY = "audio42-ui-theme"
const PRIVACY_NOTICE_STORAGE_KEY = "audiogid42-privacy-notice-accepted-v2"
function isBackofficePublicPreview() {
  if (typeof window === "undefined") {
    return false
  }

  return new URLSearchParams(window.location.search).get("preview") === "backoffice"
}

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light"
}

function getInitialPrivacyNoticeAccepted() {
  if (typeof window === "undefined") {
    return false
  }

  if (isBackofficePublicPreview()) {
    return true
  }

  return window.localStorage.getItem(PRIVACY_NOTICE_STORAGE_KEY) === "accepted"
}

function PublicFooter() {
  const { t } = useI18n()

  return (
    <footer className="site-footer panel">
      <div className="footer-grid">
        <section className="footer-column">
          <p className="eyebrow">Аудиогиды</p>
          <h3>{t("footerTitle")}</h3>
          <p className="footer-copy">
            {t("footerCopy")}
          </p>
        </section>

        <section className="footer-column">
          <p className="eyebrow">{t("footerNavigation")}</p>
          <div className="footer-links">
            <Link to="/" className="footer-link">
              {t("navAbout")}
            </Link>
            <Link to="/excursions" className="footer-link">
              {t("navExcursions")}
            </Link>
            <Link to="/guides" className="footer-link">
              {t("navGuides")}
            </Link>
            <Link to="/map" className="footer-link">
              {t("navMap")}
            </Link>
            <Link to="/contacts" className="footer-link">
              {t("navContacts")}
            </Link>
          </div>
        </section>

        <section className="footer-column">
          <p className="eyebrow">{t("footerDocs")}</p>
          <div className="footer-links">
            <Link to="/terms" className="footer-link">
              {t("navTerms")}
            </Link>
            <Link to="/offer" className="footer-link">
              {t("footerOffer")}
            </Link>
            <Link to="/privacy" className="footer-link">
              {t("footerPrivacy")}
            </Link>
            <Link to={PERSONAL_DATA_CONSENT_PATH} className="footer-link">
              {t("footerConsent")}
            </Link>
            <Link to="/payment-policy" className="footer-link">
              {t("footerPaymentPolicy")}
            </Link>
          </div>
        </section>

        <section className="footer-column">
          <p className="eyebrow">{t("footerContacts")}</p>
          <div className="footer-links">
            <a href={`mailto:${MERCHANT.email}`} className="footer-link">
              {MERCHANT.email}
            </a>
            <a href="tel:+79059689080" className="footer-link">
              {MERCHANT.phone}
            </a>
            <span className="footer-meta">{MERCHANT.shortName}</span>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <span>© {SITE_NAME}</span>
        <span>{t("footerCity")}</span>
      </div>
    </footer>
  )
}

function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const activeLocale = SUPPORTED_LOCALES.find((item) => item.code === locale) ?? SUPPORTED_LOCALES[0]

  return (
    <div className="locale-switcher" title={t("siteLanguage")}>
      <span className="visually-hidden">{t("siteLanguage")}</span>
      <button
        type="button"
        className="locale-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`locale-flag locale-flag-${activeLocale.code}`} aria-hidden="true" />
        <span className="locale-code">{activeLocale.shortLabel}</span>
      </button>
      {open ? (
        <div className="locale-menu" role="listbox" aria-label={t("siteLanguage")}>
          {SUPPORTED_LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`locale-option${item.code === locale ? " locale-option-active" : ""}`}
              role="option"
              aria-selected={item.code === locale}
              onClick={() => {
                setLocale(item.code)
                setOpen(false)
              }}
            >
              <span className={`locale-flag locale-flag-${item.code}`} aria-hidden="true" />
              <span className="locale-code">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Frame() {
  const { user, loading, logout } = useAuth()
  const { t, locale } = useI18n()
  const [uiTheme, setUiTheme] = useState<"light" | "dark">(getInitialTheme)
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(getInitialPrivacyNoticeAccepted)
  const [publicMenuOpen, setPublicMenuOpen] = useState(false)
  const location = useRouterState({
    select: (state) => state.location,
  })
  const isPublicPreview = !isBackofficeHost && isBackofficePublicPreview()

  useEffect(() => {
    setPublicMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    document.documentElement.dataset.uiSurface = isBackofficeHost ? "backoffice" : "public"

    return () => {
      delete document.documentElement.dataset.uiSurface
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return
    }

    document.documentElement.dataset.uiTheme = uiTheme
    window.localStorage.setItem(THEME_STORAGE_KEY, uiTheme)

    return () => {
      delete document.documentElement.dataset.uiTheme
    }
  }, [uiTheme])

  useEffect(() => {
    if (!isBackofficeHost) {
      return
    }

    const sectionTitle =
      location.pathname === "/finance"
        ? "Финансы кабинета"
        : location.pathname === "/statistics"
          ? "Статистика посещений"
        : location.pathname === "/search-engines"
          ? "Поисковые системы"
        : location.pathname === "/ad-banners"
          ? "Реклама"
        : location.pathname === "/guide-profile"
          ? "Карточка экскурсовода"
        : location.pathname === "/guide-studio"
          ? "Студия экскурсовода"
          : location.pathname === "/users"
            ? "Пользователи кабинета"
            : location.pathname === "/guides-admin"
              ? "Экскурсоводы кабинета"
              : location.pathname === "/tours"
                ? "Туры кабинета"
                : location.pathname === "/promo-codes"
                  ? "Промокоды кабинета"
                  : location.pathname === "/requests"
                    ? "Обращения кабинета"
                    : "Кабинет Аудиогид42"

    applySeo({
      title: sectionTitle,
      description:
        "Закрытый кабинет Аудиогид42 для администратора, бухгалтера и экскурсовода.",
      path: location.pathname,
      noindex: true,
    })
  }, [location.pathname])

  useEffect(() => {
    if (isBackofficeHost || isPublicPreview || !privacyNoticeAccepted) {
      return
    }

    void trackPublicPageView(location.pathname, location.searchStr ? `?${location.searchStr}` : "").catch(() => {
      // Analytics must never block the product flow.
    })
  }, [location.pathname, location.searchStr, privacyNoticeAccepted, locale, isPublicPreview])

  useEffect(() => {
    if (isBackofficeHost) {
      return
    }

    return applyStaticPageTranslations(locale)
  }, [location.pathname, locale])

  const acceptPrivacyNotice = () => {
    setPrivacyNoticeAccepted(true)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRIVACY_NOTICE_STORAGE_KEY, "accepted")
    }
  }

  const hasBackofficeRole = (roleSlug: string) => user?.roles.some((role) => role.slug === roleSlug) ?? false
  const canUseAdminSections = hasBackofficeRole("admin") || hasBackofficeRole("accountant")
  const canUseGuideStudio = hasBackofficeRole("guide") && Boolean(user?.guide)
  const canManageUsers = hasBackofficeRole("admin")

  return (
    <div className="app-shell">
      <header className={`topbar${!isBackofficeHost ? " public-topbar" : ""}`}>
        <Link to="/" className="brand-link">
          <div className="brand-block">
            <span className="brand-mark">Аудиогиды</span>
            <span className="brand-caption">{t("brandCaption")}</span>
          </div>
        </Link>

        <nav className={`topnav${!isBackofficeHost ? ` public-topnav${publicMenuOpen ? " public-topnav-open" : ""}` : ""}`}>
          {isBackofficeHost ? (
            <>
              <Link to="/" className="nav-link">
                Сводка
              </Link>
              {canUseAdminSections ? (
                <>
                  <Link to="/promo-codes" className="nav-link">
                    Скидки
                  </Link>
                  <Link to="/finance" className="nav-link">
                    Финансы
                  </Link>
                  {canManageUsers ? (
                    <Link to="/statistics" className="nav-link">
                      Статистика
                    </Link>
                  ) : null}
                  {canManageUsers ? (
                    <Link to="/search-engines" className="nav-link">
                      SEO
                    </Link>
                  ) : null}
                  {canManageUsers ? (
                    <Link to="/ad-banners" className="nav-link">
                      Реклама
                    </Link>
                  ) : null}
                  <Link to="/tours" className="nav-link">
                    Туры
                  </Link>
                  <Link to="/guides-admin" className="nav-link">
                    Экскурсоводы
                  </Link>
                  {canManageUsers ? (
                    <Link to="/points" className="nav-link">
                      Точки
                    </Link>
                  ) : null}
                  <Link to="/requests" className="nav-link">
                    Обращения
                  </Link>
                </>
              ) : null}
              {canManageUsers ? (
                <Link to="/users" className="nav-link">
                  Пользователи
                </Link>
              ) : null}
              {canUseGuideStudio ? (
                <>
                  <Link to="/guide-studio" className="nav-link">
                    Студия
                  </Link>
                  <Link to="/guide-profile" className="nav-link">
                    Карточка
                  </Link>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">
                {t("navAbout")}
              </Link>
              <Link to="/excursions" className="nav-link">
                {t("navExcursions")}
              </Link>
              <Link to="/guides" className="nav-link">
                {t("navGuides")}
              </Link>
              <Link to="/map" className="nav-link">
                {t("navMap")}
              </Link>
              <Link to="/terms" className="nav-link">
                {t("navTerms")}
              </Link>
              <Link to="/contacts" className="nav-link">
                {t("navContacts")}
              </Link>
            </>
          )}
        </nav>

        {!isBackofficeHost ? (
          <div className="public-header-actions">
            <LocaleSwitcher />
            <button
              type="button"
              className="public-menu-toggle"
              aria-label={publicMenuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={publicMenuOpen}
              onClick={() => setPublicMenuOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        ) : null}

        <div className="session-chip">
          <button
            type="button"
            className="mini-button theme-toggle"
            aria-label={uiTheme === "light" ? t("themeDark") : t("themeLight")}
            title={uiTheme === "light" ? t("themeDark") : t("themeLight")}
            aria-pressed={uiTheme === "dark"}
            onClick={() => setUiTheme((current) => (current === "light" ? "dark" : "light"))}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
          </button>
          {loading ? (
            <span className="session-text">Проверяем вход</span>
          ) : user ? (
            <>
              <Link to="/cabinet" className="mini-link">
                {t("cabinet")}
              </Link>
              <span className="session-text">{user.email}</span>
              <button className="mini-button" onClick={() => void logout()}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mini-link">
                {t("login")}
              </Link>
              <Link to="/register" className="mini-link">
                {t("register")}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {!isBackofficeHost ? <PublicFooter /> : null}
      {!isBackofficeHost && !privacyNoticeAccepted ? (
        <aside className="privacy-notice panel" aria-label={t("privacyNoticeAria")}>
          <div>
            <strong>{t("privacyNoticeTitle")}</strong>
            <p>
              {t("privacyNoticeBody")} <Link to="/privacy">{t("privacyNoticePrivacyLink")}</Link>{" "}
              {t("privacyNoticeAnd")}{" "}
              <Link to={PERSONAL_DATA_CONSENT_PATH}>{t("privacyNoticeConsentLink")}</Link>.
            </p>
          </div>
          <button type="button" className="button button-primary" onClick={acceptPrivacyNotice}>
            {t("privacyNoticeAccept")}
          </button>
        </aside>
      ) : null}
    </div>
  )
}

const rootRoute = createRootRoute({
  component: Frame,
  notFoundComponent: NotFoundPage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: isBackofficeHost ? BackofficeHomePage : AboutPage,
})

const excursionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/excursions",
  component: ExcursionsPage,
})

const excursionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/excursions/$slug",
  component: TourPage,
})

const guidesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guides",
  component: GuidesPage,
})

const guideDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guides/$slug",
  component: GuidePage,
})

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  component: MapPage,
})

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
})

const offerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/offer",
  component: OfferPage,
})

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
})

const personalDataConsentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PERSONAL_DATA_CONSENT_PATH,
  component: PersonalDataConsentPage,
})

const paymentPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-policy",
  component: PaymentPolicyPage,
})

const checkoutSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout/success",
  component: CheckoutSuccessPage,
})

const checkoutFailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout/fail",
  component: CheckoutFailPage,
})

const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contacts",
  component: ContactsPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: AuthLoginPage,
})

const magicLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/magic-login",
  component: AuthMagicLoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: AuthRegisterPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: AuthForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password/$token",
  component: AuthResetPasswordPage,
})

const cabinetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cabinet",
  component: AuthCabinetPage,
})

const adminPromoCodesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/promo-codes",
  component: AdminPromoCodesPage,
})

const adminFinanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance",
  component: AdminFinancePage,
})

const adminTrafficRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  component: AdminTrafficPage,
})

const adminSearchEngineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search-engines",
  component: AdminSearchEnginePage,
})

const adminAdBannersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ad-banners",
  component: AdminAdBannersPage,
})

const adminToursRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tours",
  component: AdminToursPage,
})

const adminGuidesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guides-admin",
  component: AdminGuidesPage,
})

const adminPointsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/points",
  component: AdminPointsPage,
})

const adminContactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests",
  component: AdminContactsPage,
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: AdminUsersPage,
})

const guideStudioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide-studio",
  component: GuideStudioPage,
})

const guideProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide-profile",
  component: GuideProfilePage,
})

const routeTree = rootRoute.addChildren([
  aboutRoute,
  excursionsRoute,
  excursionDetailRoute,
  guidesRoute,
  guideDetailRoute,
  mapRoute,
  termsRoute,
  offerRoute,
  privacyRoute,
  personalDataConsentRoute,
  paymentPolicyRoute,
  checkoutSuccessRoute,
  checkoutFailRoute,
  contactsRoute,
  loginRoute,
  magicLoginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  cabinetRoute,
  adminPromoCodesRoute,
  adminFinanceRoute,
  adminTrafficRoute,
  adminSearchEngineRoute,
  adminAdBannersRoute,
  adminToursRoute,
  adminGuidesRoute,
  adminPointsRoute,
  adminContactsRoute,
  adminUsersRoute,
  guideStudioRoute,
  guideProfileRoute,
])

const router = createRouter({ routeTree, basepath: import.meta.env.BASE_URL })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
