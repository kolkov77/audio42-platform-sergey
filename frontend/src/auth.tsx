import { createContext, useContext, useEffect, useState } from "react"

export type SessionUser = {
  id: number
  name: string
  email: string
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
  } | null
}

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  refreshUser: () => Promise<SessionUser | null>
  login: (payload: { email: string; password: string; remember?: boolean }) => Promise<void>
  sendMagicLink: (email: string) => Promise<string>
  consumeMagicLink: (token: string) => Promise<{ message: string; redirectTo: string | null }>
  register: (payload: {
    name: string
    email: string
    password: string
    passwordConfirmation: string
    acceptPdn: boolean
  }) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (payload: {
    token: string
    email: string
    password: string
    passwordConfirmation: string
  }) => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function getSearchParam(name: string) {
  if (typeof window === "undefined") {
    return ""
  }

  return new URLSearchParams(window.location.search).get(name) ?? ""
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    return null
  }

  return (await response.json()) as T
}

async function ensureCsrfToken() {
  const response = await fetch("/api/csrf-token", {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })

  const data = await readJson<{ csrf_token: string }>(response)

  if (!response.ok || !data?.csrf_token) {
    throw new Error("Не удалось подготовить защищённый запрос.")
  }

  return data.csrf_token
}

type ApiErrorPayload = {
  message?: string
  errors?: Record<string, string[]>
}

function normalizeApiErrorMessage(message: string) {
  const mappedMessages: Record<string, string> = {
    "validation.uploaded": "Не удалось загрузить файл. Проверьте размер и формат.",
    "validation.required": "Заполните обязательное поле.",
    "validation.email": "Введите корректный адрес электронной почты.",
    "validation.unique": "Такая запись уже существует.",
    "validation.exists": "Выбранная запись не найдена. Обновите страницу и попробуйте снова.",
    "validation.numeric": "Введите число в корректном формате.",
    "validation.integer": "Введите целое число.",
    "validation.boolean": "Выберите корректное значение.",
    "validation.array": "Передан некорректный список значений.",
    "validation.in": "Выбрано недопустимое значение.",
    "validation.min.numeric": "Число меньше допустимого значения.",
    "validation.max.numeric": "Число больше допустимого значения.",
    "validation.max.array": "В списке слишком много элементов.",
    "validation.max.file": "Файл слишком большой. Уменьшите размер и попробуйте снова.",
    "validation.file": "Не удалось прочитать файл. Выберите файл ещё раз.",
    "validation.image": "Файл должен быть изображением.",
    "validation.mimes": "Формат файла не подходит.",
    "validation.max.string": "Одно из текстовых полей слишком длинное. Сократите текст и попробуйте снова.",
    "validation.confirmed": "Подтверждение не совпадает.",
  }

  if (mappedMessages[message]) {
    return mappedMessages[message]
  }

  if (/^validation\./.test(message)) {
    return "Проверьте заполнение формы: одно из полей заполнено некорректно."
  }

  if (/^The .+ field is required\.$/.test(message)) {
    return "Заполните обязательное поле."
  }

  if (/^The selected .+ is invalid\.$/.test(message)) {
    return "Выбранная запись не найдена или больше недоступна. Обновите страницу и попробуйте снова."
  }

  if (/^The .+ must not be greater than \d+ characters\.$/.test(message)) {
    return "Одно из текстовых полей слишком длинное. Сократите текст и попробуйте снова."
  }

  if (/^The .+ must be a number\.$/.test(message) || /^The .+ must be an integer\.$/.test(message)) {
    return "Введите число в корректном формате."
  }

  if (/^The .+ must be at least .+\.$/.test(message) || /^The .+ must not be greater than .+\.$/.test(message)) {
    return "Проверьте числовое значение: оно выходит за допустимые пределы."
  }

  if (/^The .+ has already been taken\.$/.test(message)) {
    return "Такая запись уже существует."
  }

  if (/^The .+ failed to upload\.$/.test(message)) {
    return "Не удалось загрузить файл. Проверьте размер и формат."
  }

  if (/^The .+ must be (a file|an image)\.$/.test(message) || /^The .+ must be a file of type:/.test(message)) {
    return "Формат файла не подходит. Выберите другой файл."
  }

  if (message.includes("No query results for model")) {
    if (message.includes("App\\Models\\Tour")) {
      return "Тур не найден или уже удалён. Обновите список и выберите другой тур."
    }

    if (message.includes("App\\Models\\Track")) {
      return "Аудиотрек не найден или уже удалён. Обновите страницу и попробуйте снова."
    }

    if (message.includes("App\\Models\\Point") || message.includes("PointOfInterest") || message.includes("TourPoint")) {
      return "Точка не найдена или уже удалена. Обновите страницу и попробуйте снова."
    }

    return "Запись не найдена или уже удалена. Обновите страницу и попробуйте снова."
  }

  if (/SQLSTATE|Illuminate\\|App\\Models\\|Stack trace|TypeError|ReferenceError|Undefined|Call to/.test(message)) {
    return "Не удалось выполнить действие из-за внутренней ошибки. Обновите страницу и попробуйте снова."
  }

  return message
}

function extractApiErrorMessage(data: ApiErrorPayload | null) {
  if (!data) {
    return "Не удалось выполнить запрос."
  }

  if (data?.errors) {
    const firstGroup = Object.values(data.errors)[0]
    if (firstGroup?.[0]) {
      return normalizeApiErrorMessage(firstGroup[0])
    }
  }

  if (data?.message) {
    return normalizeApiErrorMessage(data.message)
  }

  return "Не удалось выполнить запрос."
}

export async function fetchApi<T>(path: string, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase()
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData
  const isMutableRequest = method !== "GET" && method !== "HEAD"

  const executeRequest = async (csrfToken?: string) => {
    const headers = new Headers(init?.headers ?? {})

    if (csrfToken) {
      headers.set("X-CSRF-TOKEN", csrfToken)
    }

    if (init?.body && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    headers.set("Accept", "application/json")
    headers.set("X-Requested-With", "XMLHttpRequest")

    return fetch(path, {
      credentials: "same-origin",
      ...init,
      cache: "no-store",
      headers,
    })
  }

  let csrfToken: string | undefined

  if (isMutableRequest) {
    csrfToken = await ensureCsrfToken()
  }

  let response = await executeRequest(csrfToken)
  let data = await readJson<T>(response)

  if (!response.ok && isMutableRequest && response.status === 419) {
    csrfToken = await ensureCsrfToken()
    response = await executeRequest(csrfToken)
    data = await readJson<T>(response)
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error("Файл слишком большой для загрузки. Загрузите файл меньшего размера или передайте материал администратору.")
    }

    throw new Error(extractApiErrorMessage(data as ApiErrorPayload | null))
  }

  return data
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("AuthContext is not available")
  }

  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const data = await fetchApi<{ user: SessionUser | null }>("/api/me")
      setUser(data?.user ?? null)
      return data?.user ?? null
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshUser()
  }, [])

  const login = async (payload: { email: string; password: string; remember?: boolean }) => {
    await fetchApi("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        remember: payload.remember ?? true,
      }),
    })

    await refreshUser()
  }

  const sendMagicLink = async (email: string) => {
    const data = await fetchApi<{ message: string }>("/api/magic-login/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    })

    return data?.message ?? "Если такой пользователь существует, ссылка отправлена."
  }

  const consumeMagicLink = async (token: string) => {
    const data = await fetchApi<{ message: string; redirect_to?: string | null }>("/api/magic-login/consume", {
      method: "POST",
      body: JSON.stringify({ token }),
    })

    await refreshUser()

    return {
      message: data?.message ?? "Вход выполнен.",
      redirectTo: data?.redirect_to ?? null,
    }
  }

  const register = async (payload: {
    name: string
    email: string
    password: string
    passwordConfirmation: string
    acceptPdn: boolean
  }) => {
    await fetchApi("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
        accept_pdn: payload.acceptPdn,
      }),
    })

    await refreshUser()
  }

  const logout = async () => {
    await fetchApi("/api/logout", {
      method: "POST",
    })

    setUser(null)
  }

  const forgotPassword = async (email: string) => {
    const data = await fetchApi<{ message: string }>("/api/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })

    return data?.message ?? "Письмо отправлено."
  }

  const resetPassword = async (payload: {
    token: string
    email: string
    password: string
    passwordConfirmation: string
  }) => {
    const data = await fetchApi<{ message: string }>("/api/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: payload.token,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      }),
    })

    return data?.message ?? "Пароль обновлён."
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        login,
        sendMagicLink,
        consumeMagicLink,
        register,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
