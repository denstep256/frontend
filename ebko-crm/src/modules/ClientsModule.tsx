import { useMemo, useState, type FormEvent } from 'react'
import type { ClientCompany, ClientRepresentative, UserProfile } from '../types'
import { canManageClients, canViewClient } from '../utils/permissions'

interface ClientsModuleProps {
  user: UserProfile
  clients: ClientCompany[]
  selectedClientId: string | null
  onSelectClient: (clientId: string | null) => void
  onUpsertClient: (client: ClientCompany) => Promise<void>
  onDeleteClient: (clientId: string) => Promise<void>
}

interface RepresentativeDraft {
  clientId: string
  representative: ClientRepresentative
}

function nextClientId(clients: ClientCompany[]): string {
  const max = clients
    .map((client) => Number(client.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `client-${max + 1}`
}

function nextRepresentativeId(clients: ClientCompany[]): string {
  const allIds = clients.flatMap((client) => client.representatives)
  const max = allIds
    .map((representative) => Number(representative.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `rep-${max + 1}`
}

function createEmptyClient(clients: ClientCompany[]): ClientCompany {
  return {
    id: nextClientId(clients),
    name: '',
    address: '',
    phone: '',
    email: '',
    representatives: [],
    siteIds: [],
  }
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

export function ClientsModule({
  user,
  clients,
  selectedClientId,
  onSelectClient,
  onUpsertClient,
  onDeleteClient,
}: ClientsModuleProps) {
  const [clientDraft, setClientDraft] = useState<ClientCompany | null>(null)
  const [representativeDraft, setRepresentativeDraft] = useState<RepresentativeDraft | null>(null)

  const isAdmin = canManageClients(user)

  const visibleClients = useMemo(
    () => clients.filter((client) => canViewClient(user, client)),
    [clients, user],
  )

  const selectedClient =
    (selectedClientId ? visibleClients.find((client) => client.id === selectedClientId) : null) ?? null

  async function saveClient(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!clientDraft) {
      return
    }

    await onUpsertClient(clientDraft)
    onSelectClient(clientDraft.id)
    setClientDraft(null)
  }

  async function saveRepresentative(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!representativeDraft) {
      return
    }

    const targetClient = clients.find((client) => client.id === representativeDraft.clientId)
    if (!targetClient) {
      return
    }

    const alreadyExists = targetClient.representatives.some(
      (representative) => representative.id === representativeDraft.representative.id,
    )

    const nextRepresentatives = alreadyExists
      ? targetClient.representatives.map((representative) =>
          representative.id === representativeDraft.representative.id
            ? representativeDraft.representative
            : representative,
        )
      : [...targetClient.representatives, representativeDraft.representative]

    await onUpsertClient({
      ...targetClient,
      representatives: nextRepresentatives,
    })

    setRepresentativeDraft(null)
  }

  if (visibleClients.length === 0) {
    return (
      <section className="module-wrap">
        <h1>Клиенты</h1>
        <p className="empty-state">Нет клиентов, доступных для текущей роли.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Клиенты</h1>
        {isAdmin && !selectedClient && !clientDraft && !representativeDraft ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setClientDraft(createEmptyClient(clients))
              onSelectClient(null)
            }}
          >
            Добавить клиента
          </button>
        ) : null}
      </div>

      {clientDraft ? (
        <form className="inline-form" onSubmit={saveClient}>
          <h3>{selectedClient ? 'Редактирование клиента' : 'Новый клиент'}</h3>
          <div className="form-grid">
            <label>
              Название компании
              <input
                className="text-input"
                value={clientDraft.name}
                onChange={(event) =>
                  setClientDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          name: event.target.value,
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Адрес
              <input
                className="text-input"
                value={clientDraft.address}
                onChange={(event) =>
                  setClientDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          address: event.target.value,
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
                value={clientDraft.phone}
                onChange={(event) =>
                  setClientDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          phone: event.target.value,
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
                value={clientDraft.email}
                onChange={(event) =>
                  setClientDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          email: event.target.value,
                        }
                      : previous,
                  )
                }
                required
              />
            </label>
          </div>

          <div className="section-head-row">
            <button type="submit" className="primary-button button-sm">
              Сохранить
            </button>
            <button type="button" className="ghost-button button-sm" onClick={() => setClientDraft(null)}>
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {representativeDraft ? (
        <form className="inline-form" onSubmit={saveRepresentative}>
          <h3>Представитель клиента</h3>
          <div className="form-grid">
            <label>
              ФИО
              <input
                className="text-input"
                value={representativeDraft.representative.name}
                onChange={(event) =>
                  setRepresentativeDraft((previous) =>
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
                value={representativeDraft.representative.phone}
                onChange={(event) =>
                  setRepresentativeDraft((previous) =>
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
                value={representativeDraft.representative.email}
                onChange={(event) =>
                  setRepresentativeDraft((previous) =>
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
                value={representativeDraft.representative.login}
                onChange={(event) =>
                  setRepresentativeDraft((previous) =>
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
                value={representativeDraft.representative.password}
                onChange={(event) =>
                  setRepresentativeDraft((previous) =>
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
                placeholder="Если пусто - будет сгенерирован"
              />
            </label>
          </div>

          <div className="section-head-row">
            <button type="submit" className="primary-button button-sm">
              Сохранить
            </button>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setRepresentativeDraft(null)}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {selectedClient ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedClient.name}</h2>
            <button type="button" className="ghost-button button-sm" onClick={() => onSelectClient(null)}>
              К списку
            </button>
          </div>

          <div className="data-columns">
            <div>
              <p>
                <strong>Адрес:</strong> {selectedClient.address}
              </p>
              <p>
                <strong>Телефон:</strong> {selectedClient.phone}
              </p>
              <p>
                <strong>Email:</strong> {selectedClient.email}
              </p>
            </div>
          </div>

          <div className="section-head-row">
            <h3>Представители клиента</h3>
            {isAdmin ? (
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() =>
                  setRepresentativeDraft({
                    clientId: selectedClient.id,
                    representative: createEmptyRepresentative(clients),
                  })
                }
              >
                Добавить представителя
              </button>
            ) : null}
          </div>

          <div className="cards-column">
            {selectedClient.representatives.map((representative) => (
              <div key={representative.id} className="plain-card">
                <p>
                  <strong>{representative.name}</strong>
                </p>
                <p>{representative.phone}</p>
                <p>{representative.email}</p>
                {isAdmin ? (
                  <p>
                    Логин: {representative.login}; Пароль: {representative.password}
                  </p>
                ) : null}

                {isAdmin ? (
                  <div className="section-head-row">
                    <button
                      type="button"
                      className="ghost-button button-sm"
                      onClick={() =>
                        setRepresentativeDraft({
                          clientId: selectedClient.id,
                          representative,
                        })
                      }
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="danger-button button-sm"
                      onClick={() => {
                        const nextRepresentatives = selectedClient.representatives.filter(
                          (item) => item.id !== representative.id,
                        )

                        void onUpsertClient({
                          ...selectedClient,
                          representatives: nextRepresentatives,
                        })
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {isAdmin ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setClientDraft(selectedClient)}
              >
                Редактировать клиента
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteClient(selectedClient.id)
                  onSelectClient(null)
                }}
              >
                Удалить клиента
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="cards-column">
          {visibleClients.map((client) => (
            <button
              type="button"
              key={client.id}
              className="appeal-card"
              onClick={() => onSelectClient(client.id)}
            >
              <div className="card-row">
                <strong>{client.name}</strong>
                <span>{client.representatives.length} представителя</span>
              </div>
              <p>{client.address}</p>
              <p>{client.phone}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
