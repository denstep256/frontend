import { useMemo, useState, type FormEvent } from 'react'
import type { ClientCompany, ClientRepresentative, UserProfile } from '../types'
import { canManageRepresentatives, canViewRepresentative } from '../utils/permissions'

interface ClientsModuleProps {
  user: UserProfile
  clients: ClientCompany[]
  onUpsertRepresentative: (
    customerId: string,
    representative: ClientRepresentative,
  ) => Promise<void>
  onDeleteRepresentative: (customerId: string, representativeId: string) => Promise<void>
}

interface RepresentativeRecord {
  customerId: string
  customerName: string
  customerAddress: string
  representative: ClientRepresentative
}

interface RepresentativeDraft {
  customerId: string
  representative: ClientRepresentative
}

function nextRepresentativeId(clients: ClientCompany[]): string {
  const allRepresentatives = clients.flatMap((client) => client.representatives)
  const max = allRepresentatives
    .map((representative) => Number(representative.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `rep-${max + 1}`
}

function createEmptyRepresentative(clients: ClientCompany[]): ClientRepresentative {
  return {
    id: nextRepresentativeId(clients),
    name: '',
    phone: '',
    email: '',
    login: '',
    password: '',
    role: 'client',
  }
}

function recordKey(customerId: string, representativeId: string): string {
  return `${customerId}:${representativeId}`
}

export function ClientsModule({
  user,
  clients,
  onUpsertRepresentative,
  onDeleteRepresentative,
}: ClientsModuleProps) {
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<RepresentativeDraft | null>(null)
  const [search, setSearch] = useState('')

  const canManage = canManageRepresentatives(user)
  const canViewCredentials = user.role !== 'client'

  const visibleRecords = useMemo<RepresentativeRecord[]>(
    () =>
      clients
        .filter((client) => canViewRepresentative(user, client.id))
        .flatMap((client) =>
          client.representatives.map((representative) => ({
            customerId: client.id,
            customerName: client.name,
            customerAddress: client.address,
            representative,
          })),
        )
        .sort((left, right) =>
          left.representative.name.localeCompare(right.representative.name, 'ru-RU'),
        ),
    [clients, user],
  )

  const filteredRecords = useMemo(() => {
    if (!search.trim()) {
      return visibleRecords
    }

    const normalized = search.toLowerCase()
    return visibleRecords.filter((record) => {
      const { representative } = record
      return (
        representative.name.toLowerCase().includes(normalized) ||
        representative.phone.toLowerCase().includes(normalized) ||
        representative.email.toLowerCase().includes(normalized) ||
        representative.login.toLowerCase().includes(normalized) ||
        record.customerName.toLowerCase().includes(normalized)
      )
    })
  }, [search, visibleRecords])

  const selectedRecord =
    (selectedRecordKey
      ? visibleRecords.find(
          (record) =>
            recordKey(record.customerId, record.representative.id) === selectedRecordKey,
        )
      : null) ?? null

  async function saveDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!draft) {
      return
    }

    const safeRepresentative = {
      ...draft.representative,
      password: draft.representative.password || Math.random().toString(36).slice(2, 12),
    }

    await onUpsertRepresentative(draft.customerId, safeRepresentative)
    setSelectedRecordKey(recordKey(draft.customerId, safeRepresentative.id))
    setDraft(null)
  }

  if (!draft && !selectedRecord && visibleRecords.length === 0) {
    return (
      <section className="module-wrap">
        <h1>Клиенты</h1>
        <p className="empty-state">Для текущей роли нет доступных представителей.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Клиенты</h1>
        {canManage && !draft && !selectedRecord ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setDraft({
                customerId: clients[0]?.id ?? '',
                representative: createEmptyRepresentative(clients),
              })
              setSelectedRecordKey(null)
            }}
            disabled={clients.length === 0}
          >
            Добавить представителя
          </button>
        ) : null}
      </div>

      {!draft && !selectedRecord ? (
        <input
          className="text-input"
          placeholder="Поиск по ФИО, контактам или компании"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {draft ? (
        <form className="inline-form" onSubmit={saveDraft}>
          <h3>{selectedRecord ? 'Редактирование представителя' : 'Новый представитель'}</h3>

          <div className="form-grid">
            <label>
              Компания
              <select
                className="text-input"
                value={draft.customerId}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          customerId: event.target.value,
                        }
                      : previous,
                  )
                }
                required
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              ФИО
              <input
                className="text-input"
                value={draft.representative.name}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            name: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Телефон
              <input
                className="text-input"
                value={draft.representative.phone}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            phone: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Email
              <input
                className="text-input"
                type="email"
                value={draft.representative.email}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            email: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Логин
              <input
                className="text-input"
                value={draft.representative.login}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            login: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Пароль
              <input
                className="text-input"
                value={draft.representative.password}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            password: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                placeholder="Если пусто - сгенерируется автоматически"
              />
            </label>
          </div>

          <div className="section-head-row">
            <button type="submit" className="primary-button button-sm">
              Сохранить
            </button>
            <button type="button" className="ghost-button button-sm" onClick={() => setDraft(null)}>
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {selectedRecord ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedRecord.representative.name}</h2>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setSelectedRecordKey(null)}
            >
              К списку
            </button>
          </div>

          <div className="data-columns">
            <div>
              <p>
                <strong>Компания:</strong> {selectedRecord.customerName}
              </p>
              <p>
                <strong>Адрес компании:</strong> {selectedRecord.customerAddress}
              </p>
              <p>
                <strong>Телефон:</strong> {selectedRecord.representative.phone}
              </p>
              <p>
                <strong>Email:</strong> {selectedRecord.representative.email}
              </p>
              <p>
                <strong>Логин:</strong> {selectedRecord.representative.login}
              </p>
              {canViewCredentials ? (
                <p>
                  <strong>Пароль:</strong> {selectedRecord.representative.password}
                </p>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() =>
                  setDraft({
                    customerId: selectedRecord.customerId,
                    representative: selectedRecord.representative,
                  })
                }
              >
                Редактировать
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteRepresentative(
                    selectedRecord.customerId,
                    selectedRecord.representative.id,
                  )
                  setSelectedRecordKey(null)
                }}
              >
                Удалить
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="cards-column">
          {filteredRecords.map((record) => (
            <button
              type="button"
              key={recordKey(record.customerId, record.representative.id)}
              className="appeal-card"
              onClick={() =>
                setSelectedRecordKey(recordKey(record.customerId, record.representative.id))
              }
            >
              <div className="card-row">
                <strong>{record.representative.name}</strong>
                <span>{record.customerName}</span>
              </div>
              <p>{record.representative.phone}</p>
              <p>{record.representative.email}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
