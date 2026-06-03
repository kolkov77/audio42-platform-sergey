import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { fetchApi, getSearchParam, useAuth } from "./auth"
import { LEGAL_DOCUMENT_VERSION, PERSONAL_DATA_CONSENT_PATH } from "./legal-pages"
import { loadCabinetOverview, type CabinetOverview } from "./public-api"
import { useSeo } from "./seo"

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value)
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

function roleLabel(slug: string) {
  if (slug === "admin") return "Админ"
  if (slug === "accountant") return "Бухгалтер"
  if (slug === "guide") return "Экскурсовод"
  return slug
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, login, sendMagicLink, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [magicError, setMagicError] = useState("")
  const [magicSuccess, setMagicSuccess] = useState("")
  const [busy, setBusy] = useState(false)
  const [magicBusy, setMagicBusy] = useState(false)
  const verified = getSearchParam("verified") === "1"

  useSeo({
    title: "Вход в кабинет",
    description: "Вход в личный кабинет Аудиогид42 по почте, паролю или одноразовой ссылке.",
    path: "/login",
    noindex: true,
  })

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: "/cabinet" })
    }
  }, [loading, navigate, user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")

    try {
      await login({ email, password, remember: true })
      void navigate({ to: "/cabinet" })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось войти.")
    } finally {
      setBusy(false)
    }
  }

  const handleMagicLink = async () => {
    setMagicBusy(true)
    setMagicError("")
    setMagicSuccess("")

    try {
      const message = await sendMagicLink(email)
      setMagicSuccess(message)
    } catch (nextError) {
      setMagicError(nextError instanceof Error ? nextError.message : "Не удалось отправить ссылку.")
    } finally {
      setMagicBusy(false)
    }
  }

  return (
    <div className="page login-page">
      <section className="login-layout">
        <article className="panel login-card">
          <p className="eyebrow">Почтовый вход</p>
          <h1>Вход в кабинет</h1>
          <p className="lede">
            Личный кабинет нужен для истории заказов, повторных входов,
            купленных туров и дальнейшего доступа к аудиомаршрутам.
          </p>

          {verified ? (
            <p className="form-success">Почта подтверждена. Теперь можно войти.</p>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Электронная почта</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Показать пароль</span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button button-primary wide-button" disabled={busy}>
              {busy ? "Входим..." : "Продолжить"}
            </button>
          </form>

          <div className="login-divider" />
          <div className="magic-login-block">
            <p className="eyebrow">Вход без пароля</p>
            <p className="lede compact">
              Можно получить одноразовую ссылку на почту и войти без пароля.
            </p>
            {magicSuccess ? <p className="form-success">{magicSuccess}</p> : null}
            {magicError ? <p className="form-error">{magicError}</p> : null}
            <button
              type="button"
              className="button button-secondary wide-button"
              disabled={magicBusy}
              onClick={() => void handleMagicLink()}
            >
              {magicBusy ? "Отправляем ссылку..." : "Войти по ссылке"}
            </button>
          </div>

          <div className="auth-links">
            <Link to="/register">Создать кабинет</Link>
            <Link to="/forgot-password">Забыли пароль?</Link>
          </div>
        </article>

        <article className="panel login-benefits">
          <p className="eyebrow">Что открывается после входа</p>
          <ul className="feature-list">
            <li>Мои маршруты и активные доступы</li>
            <li>История покупок и повторные входы</li>
            <li>Избранные точки интереса</li>
            <li>Профиль, почта и уведомления</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export function MagicLoginPage() {
  const navigate = useNavigate()
  const { consumeMagicLink } = useAuth()
  const token = getSearchParam("token")
  const [message, setMessage] = useState("Проверяем ссылку и открываем кабинет...")
  const [error, setError] = useState("")
  const startedRef = useRef(false)

  useSeo({
    title: "Вход по ссылке",
    description: "Подтверждение одноразовой ссылки для входа в кабинет Аудиогид42.",
    path: token ? `/magic-login?token=${encodeURIComponent(token)}` : "/magic-login",
    noindex: true,
  })

  useEffect(() => {
    if (!token) {
      setError("Ссылка для входа неполная или повреждена.")
      return
    }

    if (startedRef.current) {
      return
    }
    startedRef.current = true

    let cancelled = false

    void consumeMagicLink(token)
      .then((result) => {
        if (cancelled) {
          return
        }

        setMessage(result.message)
        const redirectTarget = result.redirectTo

        setTimeout(() => {
          if (!redirectTarget) {
            void navigate({ to: "/cabinet" })
            return
          }

          if (typeof window !== "undefined") {
            window.location.assign(redirectTarget)
          }
        }, 900)
      })
      .catch((nextError) => {
        if (cancelled) {
          return
        }

        setError(nextError instanceof Error ? nextError.message : "Не удалось выполнить вход по ссылке.")
      })

    return () => {
      cancelled = true
    }
  }, [navigate, token])

  return (
    <div className="page login-page">
      <section className="login-layout">
        <article className="panel login-card">
          <p className="eyebrow">Magic link</p>
          <h1>Вход по ссылке</h1>
          <p className="lede">
            Подтверждаем ссылку из письма и открываем ваш кабинет без ввода пароля.
          </p>

          {error ? <p className="form-error">{error}</p> : <p className="form-success">{message}</p>}

          <div className="auth-links">
            <Link to="/login">Вернуться ко входу</Link>
          </div>
        </article>

        <article className="panel login-benefits">
          <p className="eyebrow">Как это работает</p>
          <ul className="feature-list">
            <li>Ссылка приходит на электронную почту пользователя</li>
            <li>Обычная ссылка действует ограниченное время</li>
            <li>Служебная ссылка администратора может быть постоянной</li>
            <li>После перехода система сразу открывает нужный кабинет</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [acceptPdn, setAcceptPdn] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useSeo({
    title: "Регистрация кабинета",
    description: "Создание личного кабинета Аудиогид42 для покупок и доступа к экскурсиям.",
    path: "/register",
    noindex: true,
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!acceptPdn) {
      setError("Нужно дать согласие на обработку персональных данных.")
      return
    }

    setBusy(true)
    setError("")

    try {
      await register({
        name,
        email,
        password,
        passwordConfirmation,
        acceptPdn,
      })

      void navigate({ to: "/cabinet" })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать кабинет.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page login-page">
      <section className="login-layout">
        <article className="panel login-card">
          <p className="eyebrow">Регистрация</p>
          <h1>Создать кабинет</h1>
          <p className="lede">
            После регистрации пользователь получает историю заказов, доступы к
            купленным турам и вход по электронной почте.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Имя</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label className="field">
              <span>Электронная почта</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Повторите пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Показать пароль</span>
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

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button button-primary wide-button" disabled={busy}>
              {busy ? "Создаём кабинет..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/login">У меня уже есть кабинет</Link>
          </div>
        </article>

        <article className="panel login-benefits">
          <p className="eyebrow">После регистрации</p>
          <ul className="feature-list">
            <li>Почта становится входом и идентификатором клиента</li>
            <li>Оплаченные экскурсии сохраняются в истории заказов</li>
            <li>После подтверждения почты доступ становится персональным</li>
            <li>Дальше сюда же привязываются оплаты и доступы на 72 часа</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [busy, setBusy] = useState(false)

  useSeo({
    title: "Сброс пароля",
    description: "Восстановление доступа к кабинету Аудиогид42 по электронной почте.",
    path: "/forgot-password",
    noindex: true,
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")

    try {
      const message = await forgotPassword(email)
      setSuccess(message)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось отправить письмо.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page login-page">
      <section className="login-layout">
        <article className="panel login-card">
          <p className="eyebrow">Восстановление доступа</p>
          <h1>Сбросить пароль</h1>
          <p className="lede">
            Введите почту кабинета. Мы отправим письмо со ссылкой для нового
            пароля.
          </p>

          {success ? <p className="form-success">{success}</p> : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Электронная почта</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button button-primary wide-button" disabled={busy}>
              {busy ? "Отправляем..." : "Отправить письмо"}
            </button>
          </form>
        </article>

        <article className="panel login-benefits">
          <p className="eyebrow">Как это работает</p>
          <ul className="feature-list">
            <li>Письмо приходит на адрес, который использовался при регистрации</li>
            <li>Ссылка ведёт на защищённую форму нового пароля</li>
            <li>После смены пароля можно снова войти в кабинет</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const params = useParams({ from: "/reset-password/$token" })
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState(getSearchParam("email"))
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [busy, setBusy] = useState(false)

  useSeo({
    title: "Новый пароль",
    description: "Установка нового пароля для кабинета Аудиогид42.",
    path: `/reset-password/${params.token}`,
    noindex: true,
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")

    try {
      const message = await resetPassword({
        token: params.token,
        email,
        password,
        passwordConfirmation,
      })

      setSuccess(message)
      setTimeout(() => {
        void navigate({ to: "/login" })
      }, 1200)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сменить пароль.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page login-page">
      <section className="login-layout">
        <article className="panel login-card">
          <p className="eyebrow">Новый пароль</p>
          <h1>Обновить пароль</h1>
          <p className="lede">
            Задайте новый пароль для кабинета, чтобы снова получить доступ к
            покупкам и маршрутам.
          </p>

          {success ? <p className="form-success">{success}</p> : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Электронная почта</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Новый пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Повторите пароль</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Показать пароль</span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="button button-primary wide-button" disabled={busy}>
              {busy ? "Сохраняем..." : "Сохранить пароль"}
            </button>
          </form>
        </article>

        <article className="panel login-benefits">
          <p className="eyebrow">Защищённый доступ</p>
          <ul className="feature-list">
            <li>Ссылка из письма действует ограниченное время</li>
            <li>Старый пароль после смены больше не работает</li>
            <li>После обновления можно войти обычным способом по почте</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export function CabinetPage() {
  const navigate = useNavigate()
  const { user, loading, refreshUser } = useAuth()
  const [overview, setOverview] = useState<CabinetOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState("")
  const [verificationMessage, setVerificationMessage] = useState("")
  const [verificationBusy, setVerificationBusy] = useState(false)

  useSeo({
    title: "Личный кабинет",
    description: "История заказов, активные экскурсии и доступы пользователя Аудиогид42.",
    path: "/cabinet",
    noindex: true,
  })

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" })
    }
  }, [loading, navigate, user])

  useEffect(() => {
    if (!user) {
      setOverview(null)
      setOverviewLoading(false)
      return
    }

    setOverviewLoading(true)
    setOverviewError("")

    void loadCabinetOverview()
      .then(setOverview)
      .catch((nextError) => {
        setOverviewError(nextError instanceof Error ? nextError.message : "Не удалось загрузить кабинет.")
      })
      .finally(() => setOverviewLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="page not-found-page">
        <section className="panel not-found-card">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Проверяем вход</h1>
          <p className="lede">Подтягиваем сессию и права доступа.</p>
        </section>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleResendVerification = async () => {
    setVerificationBusy(true)
    setVerificationMessage("")

    try {
      const response = await fetchApi<{ message: string }>("/api/email/verification-notification", {
        method: "POST",
      })
      setVerificationMessage(response?.message ?? "Письмо отправлено.")
      await refreshUser()
    } catch (nextError) {
      setVerificationMessage(
        nextError instanceof Error ? nextError.message : "Не удалось отправить письмо.",
      )
    } finally {
      setVerificationBusy(false)
    }
  }

  if (overviewLoading) {
    return (
      <div className="page cabinet-page">
        <section className="panel not-found-card">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Собираем историю заказов</h1>
          <p className="lede">Подтягиваем покупки, доступы на 72 часа и персональные разделы.</p>
        </section>
      </div>
    )
  }

  if (overviewError || !overview) {
    return (
      <div className="page cabinet-page">
        <section className="panel not-found-card">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Не удалось загрузить данные</h1>
          <p className="lede">{overviewError || "Попробуйте обновить страницу немного позже."}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page cabinet-page">
      <section className="admin-hero">
        <div className="admin-copy">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Покупки, доступы и персональные маршруты</h1>
          <p className="lede">
            Кабинет знает пользователя по почте, хранит историю заказов и показывает,
            какие экскурсии уже открыты и сколько ещё действует доступ.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-tile sales">
          <span>Оплачено</span>
          <strong>{formatRub(overview.summary.total_spent_rub)}</strong>
          <em>фактически оплаченные заказы пользователя</em>
        </article>
        <article className="stat-tile views">
          <span>Заказы</span>
          <strong>{overview.summary.orders_count}</strong>
          <em>всего оформлений через этот кабинет</em>
        </article>
        <article className="stat-tile guides">
          <span>Активные доступы</span>
          <strong>{overview.summary.active_access_count}</strong>
          <em>туры, которые можно слушать прямо сейчас</em>
        </article>
        <article className="stat-tile access">
          <span>Статус почты</span>
          <strong>{overview.profile.email_verified ? "Подтверждена" : "Нужна проверка"}</strong>
          <em>{overview.profile.email}</em>
        </article>
      </section>

      {!overview.profile.email_verified ? (
        <section className="panel admin-module wide">
          <div className="module-head">
            <span className="module-tag">Подтверждение почты</span>
          </div>
          <h3>Нужно подтвердить адрес электронной почты</h3>
          <p>
            Почта используется как вход в кабинет и как идентификатор заказов. Для надёжной
            истории покупок лучше завершить подтверждение адреса.
          </p>
          <div className="cta-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handleResendVerification()}
              disabled={verificationBusy}
            >
              {verificationBusy ? "Отправляем письмо..." : "Отправить письмо повторно"}
            </button>
          </div>
          {verificationMessage ? <p className="form-success">{verificationMessage}</p> : null}
        </section>
      ) : null}

      <section className="admin-grid">
        <article className="panel admin-module">
          <div className="module-head">
            <span className="module-tag">Профиль</span>
          </div>
          <h3>{overview.profile.name}</h3>
          <p>Почта входа: {overview.profile.email}</p>
          <p>Последний вход: {formatDateTime(overview.profile.last_login_at)}</p>
          <p>
            Роли:{" "}
            {overview.profile.roles.length > 0
              ? overview.profile.roles.map((role) => roleLabel(role.slug)).join(", ")
              : "клиент"}
          </p>
        </article>

        <article className="panel admin-module">
          <div className="module-head">
            <span className="module-tag">Активные доступы</span>
          </div>
          <h3>
            {overview.active_accesses.length > 0 ? "Можно слушать прямо сейчас" : "Пока нет активных туров"}
          </h3>
          {overview.active_accesses.length > 0 ? (
            <div className="stack-list">
              {overview.active_accesses.map((access) => (
                <div key={access.id} className="stack-card">
                  <strong>{access.tour?.title || "Экскурсия"}</strong>
                  <p>
                    До {formatDateTime(access.expires_at)}. Осталось: {formatTimeLeft(access.expires_at)}.
                  </p>
                  {access.tour?.slug ? (
                    <Link to="/excursions/$slug" params={{ slug: access.tour.slug }} className="mini-link">
                      Открыть маршрут
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p>После первой оплаты здесь появятся открытые экскурсии и таймер доступа на 72 часа.</p>
          )}
        </article>

        <article className="panel admin-module">
          <div className="module-head">
            <span className="module-tag">Заказы</span>
          </div>
          <h3>{overview.summary.paid_orders_count > 0 ? "История покупок" : "История пока пустая"}</h3>
          {overview.orders.length > 0 ? (
            <div className="stack-list">
              {overview.orders.slice(0, 4).map((order) => (
                <div key={order.id} className="stack-card">
                  <strong>{order.order_number}</strong>
                  <p>
                    {order.items.map((item) => item.title).join(", ")}. {formatRub(order.total_rub)}.
                  </p>
                  <p>
                    Статус: {order.status}. Создан {formatDateTime(order.created_at)}.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>Как только появятся покупки, тут будут номер заказа, сумма, статус и связанный тур.</p>
          )}
        </article>

        <article className="panel admin-module wide">
          <div className="module-head">
            <span className="module-tag">История и переходы</span>
          </div>
          <h3>Полный след по заказам и доступам</h3>
          <div className="order-history">
            {overview.orders.length > 0 ? (
              overview.orders.map((order) => (
                <article key={order.id} className="order-row">
                  <div>
                    <strong>{order.order_number}</strong>
                    <p>{order.items.map((item) => item.title).join(", ")}</p>
                  </div>
                  <div>
                    <strong>{formatRub(order.total_rub)}</strong>
                    <p>Скидка: {formatRub(order.discount_rub)}</p>
                  </div>
                  <div>
                    <strong>{order.status}</strong>
                    <p>{formatDateTime(order.paid_at || order.created_at)}</p>
                  </div>
                  <div>
                    {order.access.length > 0 ? (
                      order.access.map((access) =>
                        access.tour_slug ? (
                          <Link key={`${order.id}-${access.tour_id}`} to="/excursions/$slug" params={{ slug: access.tour_slug }} className="mini-link">
                            {access.tour_title || "Открыть тур"}
                          </Link>
                        ) : null,
                      )
                    ) : (
                      <span className="session-text">Доступ ещё не активирован</span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p>История заказов появится здесь после первой покупки.</p>
            )}
          </div>
        </article>
      </section>

      {overview.profile.guide ? (
        <section className="panel admin-module wide">
          <div className="module-head">
            <span className="module-tag">Экскурсовод</span>
          </div>
          <h3>{overview.profile.guide.display_name}</h3>
          {overview.profile.guide.is_public ? (
            <>
              <p>
                Для этого аккаунта уже привязан профиль экскурсовода. Публичная страница автора открыта
                на сайте и связана с турами.
              </p>
              <div className="cta-row">
                <a href={`/guides/${overview.profile.guide.slug}`} className="button button-secondary">
                  Профиль экскурсовода
                </a>
              </div>
            </>
          ) : (
            <p>
              Для этого аккаунта уже привязан профиль экскурсовода. Публичная страница автора пока скрыта:
              администратор может открыть её в разделе «Экскурсоводы».
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}
