import { normalizeAppealStatus } from '../constants'
import { getMockBootstrapData } from '../mockData'
import type { Appeal, AuthTokens, CrmBootstrapData } from '../types'
import { API_BASE_URL, MOCK_NETWORK_DELAY_MS, USE_MOCK_DATA, wait } from './config'

function authHeaders(tokens: AuthTokens): HeadersInit {
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function checkResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return (await response.json()) as unknown
}

function normalizeBootstrap(payload: unknown): CrmBootstrapData {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Неверный формат bootstrap данных')
  }

  const safe = payload as Record<string, unknown>
  if (
    !Array.isArray(safe.appeals) ||
    !Array.isArray(safe.employees) ||
    !Array.isArray(safe.clients) ||
    !Array.isArray(safe.sites) ||
    !Array.isArray(safe.equipment) ||
    !Array.isArray(safe.users)
  ) {
    throw new Error('Не хватает обязательных полей в bootstrap данных')
  }

  const appeals = safe.appeals.map((rawAppeal) => {
    if (!rawAppeal || typeof rawAppeal !== 'object') {
      throw new Error('Неверный формат обращения в bootstrap данных')
    }

    const appeal = rawAppeal as Appeal & { status?: unknown }
    return {
      ...appeal,
      status: normalizeAppealStatus(appeal.status),
    } satisfies Appeal
  })

  return {
    appeals,
    employees: safe.employees as CrmBootstrapData['employees'],
    clients: safe.clients as CrmBootstrapData['clients'],
    sites: safe.sites as CrmBootstrapData['sites'],
    equipment: safe.equipment as CrmBootstrapData['equipment'],
    users: safe.users as CrmBootstrapData['users'],
  }
}

export async function loadCrmBootstrap(tokens: AuthTokens): Promise<CrmBootstrapData> {
  if (USE_MOCK_DATA) {
    await wait(MOCK_NETWORK_DELAY_MS)
    return normalizeBootstrap(getMockBootstrapData())
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/bootstrap`, {
      method: 'GET',
      headers: authHeaders(tokens),
    })

    const payload = await checkResponse(response)
    return normalizeBootstrap(payload)
  } catch {
    return normalizeBootstrap(getMockBootstrapData())
  }
}

export async function syncAppealPatch(
  tokens: AuthTokens,
  appealId: string,
  patch: Partial<Appeal>,
): Promise<void> {
  if (USE_MOCK_DATA) {
    await wait(80)
    return
  }

  await checkResponse(
    await fetch(`${API_BASE_URL}/api/v1/appeals/${appealId}`, {
      method: 'PATCH',
      headers: authHeaders(tokens),
      body: JSON.stringify(patch),
    }),
  )
}

export async function syncAppealComment(
  tokens: AuthTokens,
  appealId: string,
  text: string,
  files: Array<{ name: string; size: number }>,
): Promise<void> {
  if (USE_MOCK_DATA) {
    await wait(80)
    return
  }

  await checkResponse(
    await fetch(`${API_BASE_URL}/api/v1/appeals/${appealId}/comments`, {
      method: 'POST',
      headers: authHeaders(tokens),
      body: JSON.stringify({ text, files }),
    }),
  )
}

export async function syncAppealLink(
  tokens: AuthTokens,
  appealId: string,
  linkedAppealId: string,
): Promise<void> {
  if (USE_MOCK_DATA) {
    await wait(80)
    return
  }

  await checkResponse(
    await fetch(`${API_BASE_URL}/api/v1/appeals/${appealId}/links`, {
      method: 'POST',
      headers: authHeaders(tokens),
      body: JSON.stringify({ linked_appeal_id: linkedAppealId }),
    }),
  )
}

export async function syncAppealCreate(tokens: AuthTokens, draft: Partial<Appeal>): Promise<void> {
  if (USE_MOCK_DATA) {
    await wait(80)
    return
  }

  await checkResponse(
    await fetch(`${API_BASE_URL}/api/v1/appeals`, {
      method: 'POST',
      headers: authHeaders(tokens),
      body: JSON.stringify(draft),
    }),
  )
}
