import { findMockUserByCredentials } from '../mockData'
import type { AuthTokens, LoginPayload, LoginResult, RefreshPayload, UserProfile } from '../types'
import { API_BASE_URL, MOCK_NETWORK_DELAY_MS, USE_MOCK_DATA, wait } from './config'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function parseTokens(payload: unknown): AuthTokens | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const safePayload = payload as Record<string, unknown>
  const accessToken = safePayload.access_token ?? safePayload.accessToken
  const refreshToken = safePayload.refresh_token ?? safePayload.refreshToken

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

function parseUser(payload: unknown): UserProfile | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const safePayload = payload as Record<string, unknown>
  const user = safePayload.user
  if (!user || typeof user !== 'object') {
    return null
  }

  const safeUser = user as Record<string, unknown>
  if (typeof safeUser.id !== 'string' || typeof safeUser.fullName !== 'string') {
    return null
  }

  return {
    id: safeUser.id,
    fullName: safeUser.fullName,
    role: safeUser.role as UserProfile['role'],
    position: (safeUser.position as string) ?? 'Пользователь CRM',
    phone: (safeUser.phone as string) ?? '-',
    email: (safeUser.email as string) ?? '-',
    photoUrl: (safeUser.photoUrl as string) ?? '',
    login: (safeUser.login as string) ?? safeUser.id,
    clientId: safeUser.clientId as string | undefined,
    representativeId: safeUser.representativeId as string | undefined,
  }
}

function generateMockTokens(): AuthTokens {
  const random = crypto.randomUUID().replaceAll('-', '')
  return {
    accessToken: `mock_access_${random}`,
    refreshToken: `mock_refresh_${random}`,
  }
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) {
    return `Ошибка запроса: ${response.status}`
  }

  try {
    const payload = JSON.parse(text) as Record<string, unknown>
    const message = payload.error ?? payload.message
    if (typeof message === 'string') {
      return message
    }
  } catch {
    return text
  }

  return text
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const basicToken = btoa(`${payload.login}:${payload.password}`)

  if (!USE_MOCK_DATA) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicToken}`,
      },
    })

    if (!response.ok) {
      throw new ApiError(await parseError(response), response.status)
    }

    const body = (await response.json()) as unknown
    const tokens = parseTokens(body)
    if (!tokens) {
      throw new ApiError('Сервер не вернул access/refresh токены.', 500)
    }

    const bodyUser = parseUser(body)
    const mockUser = findMockUserByCredentials(payload.login, payload.password)

    return {
      tokens,
      user:
        bodyUser ??
        mockUser ?? {
          id: `user-${payload.login}`,
          fullName: payload.login,
          role: 'client',
          position: 'Пользователь CRM',
          phone: '-',
          email: '-',
          photoUrl: '',
          login: payload.login,
        },
    }
  }

  await wait(MOCK_NETWORK_DELAY_MS)
  const mockUser = findMockUserByCredentials(payload.login, payload.password)

  if (!mockUser) {
    throw new ApiError('Неверный логин или пароль.', 401)
  }

  return {
    tokens: generateMockTokens(),
    user: mockUser,
  }
}

export async function refreshToken(payload: RefreshPayload): Promise<AuthTokens> {
  if (USE_MOCK_DATA) {
    await wait(120)
    return {
      accessToken: `mock_access_${crypto.randomUUID().replaceAll('-', '')}`,
      refreshToken: payload.refreshToken,
    }
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: payload.refreshToken }),
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  const body = (await response.json()) as unknown
  const tokens = parseTokens(body)
  if (!tokens) {
    throw new ApiError('Сервер не вернул обновленные токены.', 500)
  }

  return tokens
}

export async function logout(tokens: AuthTokens): Promise<void> {
  if (USE_MOCK_DATA) {
    await wait(80)
    return
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }
}

export { ApiError }
