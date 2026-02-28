import { useEffect, useMemo, useState } from 'react'
import { PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../constants'
import type {
  Appeal,
  AppealPriority,
  AppealStatus,
  DashboardSortField,
  TaskDashboard,
  TaskDashboardFilters,
  TaskDashboardSort,
  UserProfile,
} from '../types'
import { CustomSelect } from '../components/CustomSelect'
import { formatDate, formatDateTime } from '../utils/format'
import { canChangeStatus } from '../utils/permissions'

interface TaskBoardModuleProps {
  user: UserProfile
  appeals: Appeal[]
  onMoveAppeal: (appealId: string, nextStatus: AppealStatus) => Promise<void>
  onOpenAppeal: (appealId: string) => void
}

const DASHBOARD_STORAGE_PREFIX = 'ebko-crm-task-dashboards-v1'

const defaultFilters: TaskDashboardFilters = {
  status: 'all',
  priority: 'all',
  type: 'all',
  search: '',
}

const defaultSort: TaskDashboardSort = {
  field: 'updatedAt',
  direction: 'desc',
}

function createDashboard(name = 'Мои обращения'): TaskDashboard {
  return {
    id: crypto.randomUUID(),
    name,
    filters: { ...defaultFilters },
    sort: { ...defaultSort },
  }
}

function storageKey(userId: string): string {
  return `${DASHBOARD_STORAGE_PREFIX}:${userId}`
}

function parseDashboards(value: string | null): TaskDashboard[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as TaskDashboard[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item) => {
      return (
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        item.filters !== undefined &&
        item.sort !== undefined
      )
    })
  } catch {
    return []
  }
}

function loadDashboards(userId: string): TaskDashboard[] {
  if (typeof window === 'undefined') {
    return [createDashboard()]
  }

  const saved = parseDashboards(window.localStorage.getItem(storageKey(userId)))
  return saved.length > 0 ? saved : [createDashboard()]
}

function comparePriority(left: AppealPriority, right: AppealPriority): number {
  return PRIORITY_ORDER.indexOf(left) - PRIORITY_ORDER.indexOf(right)
}

function compareByField(left: Appeal, right: Appeal, field: DashboardSortField): number {
  if (field === 'priority') {
    return comparePriority(left.priority, right.priority)
  }

  return new Date(left[field]).getTime() - new Date(right[field]).getTime()
}

function moveById<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items
  }

  const next = items.slice()
  const [source] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, source)
  return next
}

export function TaskBoardModule({
  user,
  appeals,
  onMoveAppeal,
  onOpenAppeal,
}: TaskBoardModuleProps) {
  const [dashboards, setDashboards] = useState<TaskDashboard[]>(() => loadDashboards(user.id))
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>(() => {
    const loaded = loadDashboards(user.id)
    return loaded[0]?.id ?? ''
  })
  const [draggedAppealId, setDraggedAppealId] = useState<string | null>(null)
  const [draggedDashboardId, setDraggedDashboardId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey(user.id), JSON.stringify(dashboards))
  }, [dashboards, user.id])

  const visibleAppeals = useMemo(() => {
    if (user.role === 'admin') {
      return appeals
    }

    if (user.role === 'client') {
      return appeals.filter((appeal) => Boolean(user.clientId && appeal.clientId === user.clientId))
    }

    return appeals.filter((appeal) => appeal.responsibleId === user.id)
  }, [appeals, user])

  const selectedDashboard =
    dashboards.find((dashboard) => dashboard.id === selectedDashboardId) ?? dashboards[0] ?? null

  const dashboardAppeals = useMemo(() => {
    if (!selectedDashboard) {
      return []
    }

    const filtered = visibleAppeals.filter((appeal) => {
      if (
        selectedDashboard.filters.status !== 'all' &&
        appeal.status !== selectedDashboard.filters.status
      ) {
        return false
      }

      if (
        selectedDashboard.filters.priority !== 'all' &&
        appeal.priority !== selectedDashboard.filters.priority
      ) {
        return false
      }

      if (selectedDashboard.filters.type !== 'all' && appeal.type !== selectedDashboard.filters.type) {
        return false
      }

      if (selectedDashboard.filters.search.trim()) {
        const normalized = selectedDashboard.filters.search.toLowerCase()
        const haystack = `${appeal.crmNumber} ${appeal.title} ${appeal.description}`.toLowerCase()
        if (!haystack.includes(normalized)) {
          return false
        }
      }

      return true
    })

    const sorted = filtered.slice().sort((left, right) => {
      const direction = selectedDashboard.sort.direction === 'asc' ? 1 : -1
      return compareByField(left, right, selectedDashboard.sort.field) * direction
    })

    return sorted
  }, [selectedDashboard, visibleAppeals])

  function updateSelectedDashboard(
    updater: (dashboard: TaskDashboard) => TaskDashboard,
  ): void {
    setDashboards((previous) =>
      previous.map((dashboard) =>
        dashboard.id === selectedDashboardId ? updater(dashboard) : dashboard,
      ),
    )
  }

  function addDashboard(): void {
    const nextDashboard = createDashboard(`Дашборд ${dashboards.length + 1}`)
    setDashboards((previous) => [...previous, nextDashboard])
    setSelectedDashboardId(nextDashboard.id)
  }

  function deleteSelectedDashboard(): void {
    if (dashboards.length <= 1) {
      return
    }

    const safeDashboards = dashboards.filter((dashboard) => dashboard.id !== selectedDashboardId)
    setDashboards(safeDashboards)
    setSelectedDashboardId(safeDashboards[0].id)
  }

  if (!selectedDashboard) {
    return (
      <section className="module-wrap">
        <h1>Доска задач</h1>
        <p className="empty-state">Не удалось инициализировать дашборды.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Доска задач</h1>
        <p className="meta">Кастомные дашборды сохраняются локально для текущего пользователя.</p>
      </div>

      <div className="dashboard-tabs-row">
        <div className="dashboard-tabs">
          {dashboards.map((dashboard) => (
            <button
              key={dashboard.id}
              type="button"
              draggable
              className={`dashboard-tab ${dashboard.id === selectedDashboardId ? 'is-active' : ''}`}
              onClick={() => setSelectedDashboardId(dashboard.id)}
              onDragStart={() => setDraggedDashboardId(dashboard.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedDashboardId) {
                  return
                }

                setDashboards((previous) => moveById(previous, draggedDashboardId, dashboard.id))
                setDraggedDashboardId(null)
              }}
              onDragEnd={() => setDraggedDashboardId(null)}
            >
              {dashboard.name}
            </button>
          ))}
        </div>

        <div className="section-head-row compact-actions">
          <button type="button" className="primary-button button-sm" onClick={addDashboard}>
            Новый дашборд
          </button>
          <button
            type="button"
            className="danger-button button-sm"
            onClick={deleteSelectedDashboard}
            disabled={dashboards.length <= 1}
          >
            Удалить
          </button>
        </div>
      </div>

      <section className="inline-form compact">
        <h3>Настройки дашборда</h3>
        <div className="form-grid">
          <label>
            Название
            <input
              className="text-input"
              value={selectedDashboard.name}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  name: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Статус
            <CustomSelect
              value={selectedDashboard.filters.status}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  filters: {
                    ...dashboard.filters,
                    status: event.target.value as TaskDashboardFilters['status'],
                  },
                }))
              }
              options={[
                { value: 'all', label: 'Все статусы' },
                ...STATUS_ORDER.map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                })),
              ]}
              placeholder={null}
              showPlaceholder={false}
            />
          </label>

          <label>
            Критичность
            <CustomSelect
              value={selectedDashboard.filters.priority}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  filters: {
                    ...dashboard.filters,
                    priority: event.target.value as TaskDashboardFilters['priority'],
                  },
                }))
              }
              options={[
                { value: 'all', label: 'Все уровни' },
                { value: 'Basic', label: 'Basic' },
                { value: 'Important', label: 'Important' },
                { value: 'Critical', label: 'Critical' },
              ]}
              placeholder={null}
              showPlaceholder={false}
            />
          </label>

          <label>
            Тип обращения
            <CustomSelect
              value={selectedDashboard.filters.type}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  filters: {
                    ...dashboard.filters,
                    type: event.target.value as TaskDashboardFilters['type'],
                  },
                }))
              }
              options={[
                { value: 'all', label: 'Все типы' },
                { value: 'KTP', label: 'KTP' },
                { value: 'WFM', label: 'WFM' },
              ]}
              placeholder={null}
              showPlaceholder={false}
            />
          </label>

          <label>
            Сортировка
            <CustomSelect
              value={selectedDashboard.sort.field}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  sort: {
                    ...dashboard.sort,
                    field: event.target.value as DashboardSortField,
                  },
                }))
              }
              options={[
                { value: 'updatedAt', label: 'По обновлению' },
                { value: 'createdAt', label: 'По созданию' },
                { value: 'deadline', label: 'По дедлайну' },
                { value: 'priority', label: 'По критичности' },
              ]}
              placeholder={null}
              showPlaceholder={false}
            />
          </label>

          <label>
            Порядок
            <CustomSelect
              value={selectedDashboard.sort.direction}
              onChange={(event) =>
                updateSelectedDashboard((dashboard) => ({
                  ...dashboard,
                  sort: {
                    ...dashboard.sort,
                    direction: event.target.value as TaskDashboardSort['direction'],
                  },
                }))
              }
              options={[
                { value: 'desc', label: 'По убыванию' },
                { value: 'asc', label: 'По возрастанию' },
              ]}
              placeholder={null}
              showPlaceholder={false}
            />
          </label>
        </div>

        <label>
          Поиск
          <input
            className="text-input"
            placeholder="По CRM номеру, заголовку или описанию"
            value={selectedDashboard.filters.search}
            onChange={(event) =>
              updateSelectedDashboard((dashboard) => ({
                ...dashboard,
                filters: {
                  ...dashboard.filters,
                  search: event.target.value,
                },
              }))
            }
          />
        </label>
      </section>

      {visibleAppeals.length === 0 ? (
        <p className="empty-state">Нет обращений, относящихся к текущему пользователю.</p>
      ) : null}

      <div className="board-grid">
        {STATUS_ORDER.map((status) => {
          const columnAppeals = dashboardAppeals.filter((appeal) => appeal.status === status)

          return (
            <div
              key={status}
              className="board-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedAppealId) {
                  return
                }

                const draggedAppeal = visibleAppeals.find((appeal) => appeal.id === draggedAppealId)
                if (!draggedAppeal) {
                  setDraggedAppealId(null)
                  return
                }

                if (draggedAppeal.status === status || !canChangeStatus(user, draggedAppeal, status)) {
                  setDraggedAppealId(null)
                  return
                }

                void onMoveAppeal(draggedAppealId, status)
                setDraggedAppealId(null)
              }}
            >
              <div className="board-column-header">
                <h3>{STATUS_LABELS[status]}</h3>
                <span>{columnAppeals.length}</span>
              </div>

              <div className="board-column-content">
                {columnAppeals.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="board-card"
                    draggable={STATUS_ORDER.some(
                      (nextStatus) =>
                        nextStatus !== appeal.status && canChangeStatus(user, appeal, nextStatus),
                    )}
                    onDragStart={() => setDraggedAppealId(appeal.id)}
                    onDragEnd={() => setDraggedAppealId(null)}
                  >
                    <button type="button" className="link-button" onClick={() => onOpenAppeal(appeal.id)}>
                      {appeal.crmNumber}
                    </button>
                    <p>{appeal.description.slice(0, 90)}...</p>
                    <div className="card-row muted">
                      <span>{appeal.priority}</span>
                      <span>Deadline: {formatDate(appeal.deadline)}</span>
                    </div>
                    <p className="meta">Обновлено: {formatDateTime(appeal.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
