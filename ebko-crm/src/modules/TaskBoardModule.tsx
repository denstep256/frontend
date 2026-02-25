import { useMemo, useState } from 'react'
import { STATUS_LABELS, STATUS_ORDER } from '../constants'
import type { Appeal, AppealStatus, UserProfile } from '../types'
import { formatDate } from '../utils/format'

interface TaskBoardModuleProps {
  user: UserProfile
  appeals: Appeal[]
  onMoveAppeal: (appealId: string, nextStatus: AppealStatus) => Promise<void>
  onOpenAppeal: (appealId: string) => void
}

export function TaskBoardModule({
  user,
  appeals,
  onMoveAppeal,
  onOpenAppeal,
}: TaskBoardModuleProps) {
  const [draggedAppealId, setDraggedAppealId] = useState<string | null>(null)

  const ownAppeals = useMemo(
    () => appeals.filter((appeal) => appeal.responsibleId === user.id),
    [appeals, user.id],
  )

  if (ownAppeals.length === 0) {
    return (
      <section className="module-wrap">
        <h1>Доска задач</h1>
        <p className="empty-state">Нет обращений, привязанных к текущему пользователю.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Доска задач</h1>
        <p className="meta">Автофильтр: обращения, где вы назначены ответственным</p>
      </div>

      <div className="board-grid">
        {STATUS_ORDER.map((status) => {
          const columnAppeals = ownAppeals.filter((appeal) => appeal.status === status)

          return (
            <div
              key={status}
              className="board-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedAppealId) {
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
                    draggable
                    onDragStart={() => setDraggedAppealId(appeal.id)}
                    onDragEnd={() => setDraggedAppealId(null)}
                  >
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => onOpenAppeal(appeal.id)}
                    >
                      {appeal.crmNumber}
                    </button>
                    <p>{appeal.description.slice(0, 90)}...</p>
                    <div className="card-row muted">
                      <span>{appeal.priority}</span>
                      <span>Deadline: {formatDate(appeal.deadline)}</span>
                    </div>
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
