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
import { EmployeesModule } from './modules/EmployeesModule'
import { ProfileModule } from './modules/ProfileModule'
import { SitesModule } from './modules/SitesModule'
import { TaskBoardModule } from './modules/TaskBoardModule'
import type {
  Appeal,
  AppealStatus,
  AuthTokens,
  ClientCompany,
  CrmBootstrapData,
  Employee,
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

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [data, setData] = useState<CrmBootstrapData | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleKey>('appeals')
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
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
      setSelectedClientId(null)
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
    setSelectedClientId(null)
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

  async function upsertClient(client: ClientCompany): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      const exists = previous.clients.some((item) => item.id === client.id)
      const clients = exists
        ? previous.clients.map((item) => (item.id === client.id ? client : item))
        : [...previous.clients, client]

      return {
        ...previous,
        clients,
      }
    })
  }

  async function deleteClient(clientId: string): Promise<void> {
    setData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        clients: previous.clients.filter((item) => item.id !== clientId),
        sites: previous.sites.filter((site) => site.clientId !== clientId),
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

    if (module === 'clients') {
      setSelectedClientId(null)
    }

    if (module === 'sites') {
      setSelectedSiteId(null)
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
              setActiveModule('sites')
            }}
            onOpenClient={(clientId) => {
              setSelectedClientId(clientId)
              setActiveModule('clients')
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
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onUpsertClient={upsertClient}
            onDeleteClient={deleteClient}
          />
        )

      case 'sites':
        return (
          <SitesModule
            user={user}
            sites={currentData.sites}
            clients={currentData.clients}
            equipment={currentData.equipment}
            selectedSiteId={selectedSiteId}
            onSelectSite={setSelectedSiteId}
            onUpsertSite={upsertSite}
            onDeleteSite={deleteSite}
          />
        )

      case 'task_board':
        return (
          <TaskBoardModule
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
