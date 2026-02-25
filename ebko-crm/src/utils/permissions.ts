import type {
  Appeal,
  AppealStatus,
  ClientCompany,
  ModuleKey,
  Site,
  UserProfile,
} from '../types'

export function canAccessModule(role: UserProfile['role'], module: ModuleKey): boolean {
  switch (module) {
    case 'employees':
      return role !== 'client'
    default:
      return true
  }
}

export function canViewAppeal(user: UserProfile, appeal: Appeal): boolean {
  if (user.role !== 'client') {
    return true
  }

  return Boolean(user.clientId && appeal.clientId === user.clientId)
}

export function canEditAppeal(user: UserProfile, appeal: Appeal): boolean {
  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'operator_ktp') {
    return true
  }

  if (user.role === 'engineer_wfm') {
    return appeal.type === 'WFM'
  }

  return Boolean(user.clientId && appeal.clientId === user.clientId)
}

export function canCreateAppealType(user: UserProfile, type: Appeal['type']): boolean {
  if (user.role === 'admin' || user.role === 'operator_ktp') {
    return true
  }

  if (user.role === 'engineer_wfm') {
    return type === 'WFM'
  }

  return true
}

export function canChangeStatus(
  user: UserProfile,
  appeal: Appeal,
  nextStatus: AppealStatus,
): boolean {
  if (!canEditAppeal(user, appeal)) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'operator_ktp') {
    if (appeal.type !== 'KTP' && appeal.type !== 'WFM') {
      return false
    }

    const forbiddenForClientCreated = nextStatus === 'Verified' || nextStatus === 'Canceled'
    if (forbiddenForClientCreated && appeal.createdById.startsWith('client-')) {
      return false
    }

    return true
  }

  if (user.role === 'engineer_wfm') {
    return appeal.type === 'WFM'
  }

  return true
}

export function canAssignResponsible(user: UserProfile, appeal: Appeal): boolean {
  if (!appeal) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'operator_ktp' || user.role === 'engineer_wfm') {
    return true
  }

  return false
}

export function canLinkAppeals(user: UserProfile): boolean {
  return user.role !== 'client'
}

export function canViewEmployeeCredentials(user: UserProfile): boolean {
  return user.role === 'admin'
}

export function canManageEmployees(user: UserProfile): boolean {
  return user.role === 'admin'
}

export function canViewClient(user: UserProfile, client: ClientCompany): boolean {
  if (user.role !== 'client') {
    return true
  }

  return user.clientId === client.id
}

export function canManageClients(user: UserProfile): boolean {
  return user.role === 'admin'
}

export function canViewSite(user: UserProfile, site: Site): boolean {
  if (user.role !== 'client') {
    return true
  }

  return user.clientId === site.clientId
}

export function canManageSites(user: UserProfile): boolean {
  return user.role === 'admin'
}

export function canManageEquipment(user: UserProfile): boolean {
  return user.role === 'admin' || user.role === 'engineer_wfm'
}

export function isOwnAppeal(user: UserProfile, appeal: Appeal): boolean {
  if (user.role === 'client') {
    return Boolean(user.clientId && appeal.clientId === user.clientId)
  }

  return appeal.responsibleId === user.id
}
