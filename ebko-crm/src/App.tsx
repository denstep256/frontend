import { useState } from 'react'
import './App.css'
import { ApiError, login, logout } from './api/auth'
import {
  loadCrmBootstrap,
  syncAppealComment,
  syncAppealCreate,
  syncAppealLink,
  syncAppealPatch,
} from './api/crm'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { AppealsModule } from './modules/AppealsModule'
import { ClientsModule } from './modules/ClientsModule'
import { CustomersModule } from './modules/CustomersModule'
import { EmployeesModule } from './modules/EmployeesModule'
import { EquipmentModule } from './modules/EquipmentModule'
import { ProfileModule } from './modules/ProfileModule'
import { TaskBoardModule } from './modules/TaskBoardModule'
import type {
  Appeal,
  AppealStatus,
  AuthTokens,
  ClientRepresentative,
  ClientCompany,
  CrmBootstrapData,
  Employee,
  EquipmentUnit,
  FileAttachment,
  LoginPayload,
  ModuleKey,
  Site,
  UserProfile,
} from './types'
import { canAccessModule } from './utils/permissions'

interface Session {
  user: UserProfile
  tokens: AuthTokens
}

function resolveCurrentUser(user: UserProfile, data: CrmBootstrapData): UserProfile {
  return (
    data.users.find((item) => item.id === user.id || item.login === user.login) ??
    data.users.find((item) => item.id === user.id) ??
    user
  )
}

function syncCustomerSiteIds(customers: ClientCompany[], sites: Site[]): ClientCompany[] {
  return customers.map((customer) => ({
    ...customer,
    siteIds: sites.filter((site) => site.clientId === customer.id).map((site) => site.id),
  }))
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [data, setData] = useState<CrmBootstrapData | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleKey>('appeals')
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSignedIn = Boolean(session && data)

  async function handleLogin(payload: LoginPayload): Promise<void> {
    setIsAuthLoading(true)
    setErrorMessage(null)

    try {
      const loginResult = await login(payload)
      setIsDataLoading(true)
      const bootstrap = await loadCrmBootstrap(loginResult.tokens)
      const currentUser = resolveCurrentUser(loginResult.user, bootstrap)

      setSession({ user: currentUser, tokens: loginResult.tokens })
      setData(bootstrap)
      setActiveModule('appeals')
      setSelectedAppealId(null)
      setSelectedSiteId(null)
      setSelectedCustomerId(null)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Не удалось выполнить вход. Проверьте доступность API.')
      }
    } finally {
      setIsAuthLoading(false)
      setIsDataLoading(false)
    }
  }

  async function handleLogout(): Promise<void> {
    if (session) {
      try {
        await logout(session.tokens)
      } catch {
        // Игнорируем ошибки logout, чтобы не блокировать выход.
      }
    }

    setSession(null)
    setData(null)
    setSelectedAppealId(null)
    setSelectedSiteId(null)
    setSelectedCustomerId(null)
    setErrorMessage(null)
  }

  if (!isSignedIn || !session || !data) {
    return <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} errorMessage={errorMessage} />
  }

  const { user, tokens } = session
  const currentData: CrmBootstrapData = data

  async function createAppeal(draft: Omit<Appeal, 'id'>): Promise<void> {
    const appeal: Appeal = {
      id: `appeal-${Date.now()}`,
      ...draft,
    }

    setData((previous) =>
      previous
        ? {
            ...previous,
            appeals: [appeal, ...previous.appeals],
          }
        : previous,
    )

    setSelectedAppealId(appeal.id)
    await syncAppealCreate(tokens, appeal)
  }

  async function updateAppeal(appealId: string, patch: Partial<Appeal>): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        appeals: previous.appeals.map((appeal) =>
          appeal.id === appealId
            ? {
                ...appeal,
                ...patch,
              }
            : appeal,
        ),
      }
    })

    await syncAppealPatch(tokens, appealId, patch)
  }

  async function addComment(appealId: string, text: string, files: FileAttachment[]): Promise<void> {
    const comment = {
      id: crypto.randomUUID(),
      appealId,
      authorId: user.id,
      authorName: user.fullName,
      text,
      createdAt: new Date().toISOString(),
      files,
    }

    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        appeals: previous.appeals.map((appeal) =>
          appeal.id === appealId
            ? {
                ...appeal,
                comments: [...appeal.comments, comment],
                updatedAt: comment.createdAt,
              }
            : appeal,
        ),
      }
    })

    await syncAppealComment(
      tokens,
      appealId,
      text,
      files.map((file) => ({ name: file.name, size: file.size })),
    )
  }

  async function linkAppeal(appealId: string, linkedAppealId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        appeals: previous.appeals.map((appeal) => {
          if (appeal.id !== appealId && appeal.id !== linkedAppealId) {
            return appeal
          }

          const alreadyLinked = appeal.linkedAppealIds.includes(
            appeal.id === appealId ? linkedAppealId : appealId,
          )

          if (alreadyLinked) {
            return appeal
          }

          return {
            ...appeal,
            linkedAppealIds: [
              ...appeal.linkedAppealIds,
              appeal.id === appealId ? linkedAppealId : appealId,
            ],
            updatedAt: new Date().toISOString(),
          }
        }),
      }
    })

    await syncAppealLink(tokens, appealId, linkedAppealId)
  }

  async function unlinkAppeal(appealId: string, linkedAppealId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        appeals: previous.appeals.map((appeal) => {
          if (appeal.id !== appealId && appeal.id !== linkedAppealId) {
            return appeal
          }

          return {
            ...appeal,
            linkedAppealIds: appeal.linkedAppealIds.filter((id) =>
              appeal.id === appealId ? id !== linkedAppealId : id !== appealId,
            ),
            updatedAt: new Date().toISOString(),
          }
        }),
      }
    })

    await syncAppealPatch(tokens, appealId, { updatedAt: new Date().toISOString() })
  }

  async function upsertEmployee(employee: Employee): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const exists = previous.employees.some((item) => item.id === employee.id)
      const employees = exists
        ? previous.employees.map((item) => (item.id === employee.id ? employee : item))
        : [...previous.employees, employee]

      return {
        ...previous,
        employees,
      }
    })
  }

  async function deleteEmployee(employeeId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        employees: previous.employees.filter((item) => item.id !== employeeId),
      }
    })
  }

  async function upsertCustomer(customer: ClientCompany): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const exists = previous.clients.some((item) => item.id === customer.id)
      const clients = exists
        ? previous.clients.map((item) => (item.id === customer.id ? customer : item))
        : [...previous.clients, customer]

      return {
        ...previous,
        clients: syncCustomerSiteIds(clients, previous.sites),
      }
    })
  }

  async function deleteCustomer(customerId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const sites = previous.sites.filter((site) => site.clientId !== customerId)
      const clients = previous.clients.filter((item) => item.id !== customerId)

      return {
        ...previous,
        clients: syncCustomerSiteIds(clients, sites),
        sites,
      }
    })
  }

  async function upsertSite(site: Site): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const exists = previous.sites.some((item) => item.id === site.id)
      const sites = exists
        ? previous.sites.map((item) => (item.id === site.id ? site : item))
        : [...previous.sites, site]

      return {
        ...previous,
        sites,
        clients: syncCustomerSiteIds(previous.clients, sites),
      }
    })
  }

  async function deleteSite(siteId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        sites: previous.sites.filter((site) => site.id !== siteId),
        clients: syncCustomerSiteIds(
          previous.clients,
          previous.sites.filter((site) => site.id !== siteId),
        ),
      }
    })
  }

  async function upsertRepresentative(
    customerId: string,
    representative: ClientRepresentative,
  ): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const clients = previous.clients.map((client) => {
        if (client.id !== customerId) {
          return client
        }

        const exists = client.representatives.some((item) => item.id === representative.id)
        const representatives = exists
          ? client.representatives.map((item) => (item.id === representative.id ? representative : item))
          : [...client.representatives, representative]

        return {
          ...client,
          representatives,
        }
      })

      return {
        ...previous,
        clients,
      }
    })
  }

  async function deleteRepresentative(customerId: string, representativeId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        clients: previous.clients.map((client) =>
          client.id === customerId
            ? {
                ...client,
                representatives: client.representatives.filter((item) => item.id !== representativeId),
              }
            : client,
        ),
      }
    })
  }

  async function upsertEquipment(equipmentUnit: EquipmentUnit): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const exists = previous.equipment.some((item) => item.id === equipmentUnit.id)
      const equipment = exists
        ? previous.equipment.map((item) => (item.id === equipmentUnit.id ? equipmentUnit : item))
        : [...previous.equipment, equipmentUnit]

      return {
        ...previous,
        equipment,
      }
    })
  }

  async function deleteEquipment(equipmentId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        equipment: previous.equipment.filter((item) => item.id !== equipmentId),
        sites: previous.sites.map((site) => ({
          ...site,
          facility: site.facility.filter((facility) => facility.equipmentId !== equipmentId),
        })),
      }
    })
  }

  async function updateProfile(patch: Partial<UserProfile>): Promise<void> {
    const updatedUser = { ...user, ...patch }

    setSession((previous) => (previous ? { ...previous, user: updatedUser } : previous))
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        users: previous.users.map((item) => (item.id === user.id ? updatedUser : item)),
        employees: previous.employees.map((employee) =>
          employee.id === user.id
            ? {
                ...employee,
                photoUrl: patch.photoUrl ?? employee.photoUrl,
                position: patch.position ?? employee.position,
                phone: patch.phone ?? employee.phone,
                email: patch.email ?? employee.email,
              }
            : employee,
        ),
        clients: previous.clients.map((client) => ({
          ...client,
          representatives: client.representatives.map((representative) =>
            representative.id === user.representativeId
              ? {
                  ...representative,
                  phone: patch.phone ?? representative.phone,
                  email: patch.email ?? representative.email,
                }
              : representative,
          ),
        })),
      }
    })
  }

  async function moveAppeal(appealId: string, nextStatus: AppealStatus): Promise<void> {
    await updateAppeal(appealId, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
  }

  function handleSidebarModuleChange(module: ModuleKey): void {
    setActiveModule(module)

    if (module === 'appeals') {
      setSelectedAppealId(null)
    }

    if (module !== 'customers') {
      setSelectedSiteId(null)
      setSelectedCustomerId(null)
    }
  }

  function renderModule() {
    if (!canAccessModule(user.role, activeModule)) {
      return <p className="empty-state">Текущая роль не имеет доступа к выбранному модулю.</p>
    }

    switch (activeModule) {
      case 'appeals':
        return (
          <AppealsModule
            user={user}
            appeals={currentData.appeals}
            employees={currentData.employees}
            clients={currentData.clients}
            sites={currentData.sites}
            selectedAppealId={selectedAppealId}
            onSelectAppeal={setSelectedAppealId}
            onCreateAppeal={createAppeal}
            onUpdateAppeal={updateAppeal}
            onAddComment={addComment}
            onLinkAppeal={linkAppeal}
            onUnlinkAppeal={unlinkAppeal}
            onOpenSite={(siteId) => {
              setSelectedSiteId(siteId)
              const site = currentData.sites.find((item) => item.id === siteId)
              setSelectedCustomerId(site?.clientId ?? null)
              setActiveModule('customers')
            }}
            onOpenCustomer={(customerId) => {
              setSelectedCustomerId(customerId)
              setSelectedSiteId(null)
              setActiveModule('customers')
            }}
          />
        )

      case 'employees':
        return (
          <EmployeesModule
            user={user}
            employees={currentData.employees}
            onUpsertEmployee={upsertEmployee}
            onDeleteEmployee={deleteEmployee}
          />
        )

      case 'clients':
        return (
          <ClientsModule
            user={user}
            clients={currentData.clients}
            onUpsertRepresentative={upsertRepresentative}
            onDeleteRepresentative={deleteRepresentative}
          />
        )

      case 'customers':
        return (
          <CustomersModule
            user={user}
            customers={currentData.clients}
            sites={currentData.sites}
            equipment={currentData.equipment}
            selectedSiteId={selectedSiteId}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onSelectSite={setSelectedSiteId}
            onUpsertCustomer={upsertCustomer}
            onDeleteCustomer={deleteCustomer}
            onUpsertSite={upsertSite}
            onDeleteSite={deleteSite}
          />
        )

      case 'equipment':
        return (
          <EquipmentModule
            user={user}
            equipment={currentData.equipment}
            onUpsertEquipment={upsertEquipment}
            onDeleteEquipment={deleteEquipment}
          />
        )

      case 'task_board':
        return (
          <TaskBoardModule
            key={user.id}
            user={user}
            appeals={currentData.appeals}
            onMoveAppeal={moveAppeal}
            onOpenAppeal={(appealId) => {
              setSelectedAppealId(appealId)
              setActiveModule('appeals')
            }}
          />
        )

      case 'profile':
        return <ProfileModule user={user} onUpdateProfile={updateProfile} />

      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        activeModule={activeModule}
        onModuleChange={handleSidebarModuleChange}
        onLogout={handleLogout}
      />

      <main className="workspace">{isDataLoading ? <p className="empty-state">Загрузка данных...</p> : renderModule()}</main>
    </div>
  )
}

export default App

