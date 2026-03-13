import { useMemo, useState, type FormEvent } from 'react'
import type { ClientCompany, ClientRepresentative, UserProfile } from '../types'
import { canManageRepresentatives, canViewRepresentative } from '../utils/permissions'
import { CustomSelect } from '../components/CustomSelect'

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
    .map((representative) => Number(representative.accountId.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `acc-rep-${max + 1}`
}

function createEmptyRepresentative(clients: ClientCompany[], customerId: string): ClientRepresentative {
  return {
    accountId: nextRepresentativeId(clients),
    clientId: customerId,
    fullName: '',
    phoneNumber: '',
    email: '',
    login: '',
    passwordHash: '',
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
          left.representative.fullName.localeCompare(right.representative.fullName, 'ru-RU'),
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
        representative.fullName.toLowerCase().includes(normalized) ||
        representative.phoneNumber.toLowerCase().includes(normalized) ||
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
            recordKey(record.customerId, record.representative.accountId) === selectedRecordKey,
        )
      : null) ?? null

  async function saveDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!draft) {
      return
    }

    const safeRepresentative = {
      ...draft.representative,
      clientId: draft.customerId,
      passwordHash: draft.representative.passwordHash || Math.random().toString(36).slice(2, 12),
    }

    await onUpsertRepresentative(draft.customerId, safeRepresentative)
    setSelectedRecordKey(recordKey(draft.customerId, safeRepresentative.accountId))
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
              const customerId = clients[0]?.id ?? ''
              setDraft({
                customerId,
                representative: createEmptyRepresentative(clients, customerId),
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
              <CustomSelect
                value={draft.customerId}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          customerId: event.target.value,
                          representative: {
                            ...previous.representative,
                            clientId: event.target.value,
                          },
                        }
                      : previous,
                  )
                }
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                placeholder={null}
                showPlaceholder={false}
                required
              />
            </label>

            <label>
              ФИО
              <input
                className="text-input"
                value={draft.representative.fullName}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            fullName: event.target.value,
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
                value={draft.representative.phoneNumber}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            phoneNumber: event.target.value,
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
              Пароль (hash)
              <input
                className="text-input"
                value={draft.representative.passwordHash}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          representative: {
                            ...previous.representative,
                            passwordHash: event.target.value,
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
            <h2>{selectedRecord.representative.fullName}</h2>
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
                <strong>Телефон:</strong> {selectedRecord.representative.phoneNumber}
              </p>
              <p>
                <strong>Email:</strong> {selectedRecord.representative.email}
              </p>
              <p>
                <strong>Логин:</strong> {selectedRecord.representative.login}
              </p>
              {canViewCredentials ? (
                <p>
                  <strong>Пароль (hash):</strong> {selectedRecord.representative.passwordHash}
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
                    selectedRecord.representative.accountId,
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
              key={recordKey(record.customerId, record.representative.accountId)}
              className="appeal-card"
              onClick={() =>
                setSelectedRecordKey(recordKey(record.customerId, record.representative.accountId))
              }
            >
              <div className="card-row">
                <strong>{record.representative.fullName}</strong>
                <span>{record.customerName}</span>
              </div>
              <p>{record.representative.phoneNumber}</p>
              <p>{record.representative.email}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
