import { normalizeAppealStatus } from '../constants'
import { getMockBootstrapData } from '../mockData'
import type { Appeal, AppealComment, AuthTokens, CrmBootstrapData } from '../types'
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

function normalizeComment(rawComment: unknown, fallbackTicketId: string): AppealComment {
  const safeComment = (rawComment && typeof rawComment === 'object' ? rawComment : {}) as Record<
    string,
    unknown
  >

  const createdAt =
    (safeComment.createdAt as string | undefined) ??
    (safeComment.created_at as string | undefined) ??
    new Date().toISOString()

  return {
    id: (safeComment.id as string | undefined) ?? crypto.randomUUID(),
    ticketId:
      (safeComment.ticketId as string | undefined) ??
      (safeComment.ticket_id as string | undefined) ??
      fallbackTicketId,
    isClosedComment:
      (safeComment.isClosedComment as boolean | undefined) ??
      (safeComment.is_closed_comment as boolean | undefined) ??
      false,
    createdBy:
      (safeComment.createdBy as string | undefined) ??
      (safeComment.created_by as string | undefined) ??
      'system',
    authorName: (safeComment.authorName as string | undefined) ?? 'Пользователь',
    contents:
      (safeComment.contents as string | undefined) ??
      (safeComment.text as string | undefined) ??
      '',
    createdAt,
    updatedAt:
      (safeComment.updatedAt as string | undefined) ??
      (safeComment.updated_at as string | undefined) ??
      createdAt,
    files: (safeComment.files as AppealComment['files'] | undefined) ?? [],
  }
}

function normalizeAppeal(rawAppeal: unknown): Appeal {
  const safeAppeal = (rawAppeal && typeof rawAppeal === 'object' ? rawAppeal : {}) as Record<
    string,
    unknown
  >

  const id = (safeAppeal.id as string | undefined) ?? `appeal-${Date.now()}`
  const statusId = normalizeAppealStatus(safeAppeal.statusId ?? safeAppeal.status)
  const typeId = (safeAppeal.typeId as Appeal['typeId'] | undefined) ??
    (safeAppeal.type as Appeal['typeId'] | undefined) ??
    'KTP'

  return {
    id,
    title:
      (safeAppeal.title as string | undefined) ??
      (safeAppeal.crmNumber as string | undefined) ??
      `CRM-${id}`,
    description: (safeAppeal.description as string | undefined) ?? '',
    typeId,
    statusId,
    criticalityId:
      (safeAppeal.criticalityId as Appeal['criticalityId'] | undefined) ??
      (safeAppeal.priority as Appeal['criticalityId'] | undefined) ??
      'Basic',
    productId:
      (safeAppeal.productId as string | undefined) ??
      (safeAppeal.product_id as string | undefined) ??
      (safeAppeal.product as string | undefined),
    clientId:
      (safeAppeal.clientId as string | undefined) ??
      (safeAppeal.client_id as string | undefined) ??
      '',
    siteId:
      (safeAppeal.siteId as string | undefined) ??
      (safeAppeal.site_id as string | undefined) ??
      undefined,
    responsibleId:
      (safeAppeal.responsibleId as string | undefined) ??
      (safeAppeal.responsible_id as string | undefined) ??
      undefined,
    createdBy:
      (safeAppeal.createdBy as string | undefined) ??
      (safeAppeal.created_by as string | undefined) ??
      (safeAppeal.createdById as string | undefined) ??
      'system',
    updatedBy:
      (safeAppeal.updatedBy as string | undefined) ??
      (safeAppeal.updated_by as string | undefined) ??
      (safeAppeal.createdBy as string | undefined) ??
      (safeAppeal.created_by as string | undefined) ??
      'system',
    createdAt:
      (safeAppeal.createdAt as string | undefined) ??
      (safeAppeal.created_at as string | undefined) ??
      new Date().toISOString(),
    updatedAt:
      (safeAppeal.updatedAt as string | undefined) ??
      (safeAppeal.updated_at as string | undefined) ??
      new Date().toISOString(),
    linkedTicketIds:
      (safeAppeal.linkedTicketIds as string[] | undefined) ??
      (safeAppeal.linkedAppealIds as string[] | undefined) ??
      [],
    comments: Array.isArray(safeAppeal.comments)
      ? safeAppeal.comments.map((comment) => normalizeComment(comment, id))
      : [],
  }
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

  return {
    appeals: safe.appeals.map((appeal) => normalizeAppeal(appeal)),
    employees: safe.employees as CrmBootstrapData['employees'],
    clients: safe.clients as CrmBootstrapData['clients'],
    sites: safe.sites as CrmBootstrapData['sites'],
    equipment: safe.equipment as CrmBootstrapData['equipment'],
    users: safe.users as CrmBootstrapData['users'],
    products: (safe.products as CrmBootstrapData['products'] | undefined) ?? [],
    equipmentTypes: (safe.equipmentTypes as CrmBootstrapData['equipmentTypes'] | undefined) ?? [],
    ticketTypes: (safe.ticketTypes as CrmBootstrapData['ticketTypes'] | undefined) ?? [],
    ticketStatuses: (safe.ticketStatuses as CrmBootstrapData['ticketStatuses'] | undefined) ?? [],
    ticketCriticalities:
      (safe.ticketCriticalities as CrmBootstrapData['ticketCriticalities'] | undefined) ?? [],
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
  contents: string,
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
      body: JSON.stringify({ contents, files }),
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
