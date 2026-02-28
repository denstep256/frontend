import { useMemo, useState, type FormEvent } from 'react'
import { ROLE_LABELS } from '../constants'
import { CustomSelect } from '../components/CustomSelect'
import type { Employee, UserProfile } from '../types'
import { initials } from '../utils/format'
import { canManageEmployees, canViewEmployeeCredentials } from '../utils/permissions'

interface EmployeesModuleProps {
  user: UserProfile
  employees: Employee[]
  onUpsertEmployee: (employee: Employee) => Promise<void>
  onDeleteEmployee: (employeeId: string) => Promise<void>
}

function nextEmployeeId(employees: Employee[]): string {
  const max = employees
    .map((employee) => Number(employee.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `emp-generated-${max + 1}`
}

function defaultEmployee(employees: Employee[]): Employee {
  return {
    id: nextEmployeeId(employees),
    humanId: `human-${1000 + employees.length + 1}`,
    fullName: '',
    photoUrl: '',
    age: 25,
    position: '',
    phone: '',
    email: '',
    role: 'operator_ktp',
    login: '',
    password: '',
  }
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Ошибка чтения изображения'))
    }
    reader.onerror = () => reject(new Error('Ошибка чтения изображения'))
    reader.readAsDataURL(file)
  })
}

export function EmployeesModule({
  user,
  employees,
  onUpsertEmployee,
  onDeleteEmployee,
}: EmployeesModuleProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Employee | null>(null)
  const [search, setSearch] = useState('')

  const isAdmin = canManageEmployees(user)
  const canSeeCredentials = canViewEmployeeCredentials(user)

  const sortedEmployees = useMemo(
    () =>
      employees
        .slice()
        .sort((left, right) => left.fullName.localeCompare(right.fullName, 'ru-RU')),
    [employees],
  )

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) {
      return sortedEmployees
    }

    const normalized = search.toLowerCase()
    return sortedEmployees.filter((employee) => {
      const fullName = employee.fullName.toLowerCase()
      const position = employee.position.toLowerCase()
      return fullName.includes(normalized) || position.includes(normalized)
    })
  }, [search, sortedEmployees])

  const selectedEmployee =
    (selectedEmployeeId ? sortedEmployees.find((employee) => employee.id === selectedEmployeeId) : null) ??
    null

  if (user.role === 'client') {
    return (
      <section className="module-wrap">
        <h1>Сотрудники</h1>
        <p className="empty-state">У роли Клиент нет доступа к модулю сотрудников.</p>
      </section>
    )
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!draft) {
      return
    }

    const safeDraft = {
      ...draft,
      password: draft.password || Math.random().toString(36).slice(2, 12),
    }

    await onUpsertEmployee(safeDraft)
    setSelectedEmployeeId(safeDraft.id)
    setDraft(null)
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Сотрудники</h1>
        {isAdmin && !selectedEmployee && !draft ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setDraft(defaultEmployee(sortedEmployees))
              setSelectedEmployeeId(null)
            }}
          >
            Добавить сотрудника
          </button>
        ) : null}
      </div>

      {!selectedEmployee && !draft ? (
        <input
          className="text-input"
          placeholder="Поиск по ФИО или должности"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {draft ? (
        <form className="inline-form" onSubmit={saveDraft}>
          <h3>{selectedEmployee ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h3>

          <div className="form-grid">
            <label>
              ФИО
              <input
                className="text-input"
                value={draft.fullName}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          fullName: event.target.value,
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Возраст
              <input
                className="text-input"
                type="number"
                value={draft.age}
                min={18}
                max={75}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          age: Number(event.target.value),
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Должность
              <input
                className="text-input"
                value={draft.position}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          position: event.target.value,
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
                value={draft.phone}
                onChange={(event) =>
                  setDraft((previous) =>
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
                value={draft.email}
                onChange={(event) =>
                  setDraft((previous) =>
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

            <label>
              Роль
              <CustomSelect
                value={draft.role}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          role: event.target.value as Employee['role'],
                        }
                      : previous,
                  )
                }
                options={[
                  { value: 'admin', label: 'Админ' },
                  { value: 'operator_ktp', label: 'Оператор КТП' },
                  { value: 'engineer_wfm', label: 'Инженер WFM' },
                ]}
                placeholder={null}
                showPlaceholder={false}
              />
            </label>

            <label>
              Логин
              <input
                className="text-input"
                value={draft.login}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          login: event.target.value,
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
                value={draft.password}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          password: event.target.value,
                        }
                      : previous,
                  )
                }
                placeholder="Если пусто - сгенерируется автоматически"
              />
            </label>

            <label>
              Фото (URL)
              <input
                className="text-input"
                value={draft.photoUrl}
                onChange={(event) =>
                  setDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          photoUrl: event.target.value,
                        }
                      : previous,
                  )
                }
                placeholder="https://..."
              />
            </label>

            <label>
              Фото (файл)
              <input
                className="text-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const imageFile = event.target.files?.[0]
                  if (!imageFile) {
                    return
                  }

                  void readImageAsDataUrl(imageFile).then((photoUrl) => {
                    setDraft((previous) =>
                      previous
                        ? {
                            ...previous,
                            photoUrl,
                          }
                        : previous,
                    )
                  })
                }}
              />
            </label>
          </div>

          {draft.photoUrl ? (
            <div className="photo-preview-wrap">
              <img className="avatar-photo" src={draft.photoUrl} alt="Предпросмотр фото сотрудника" />
            </div>
          ) : null}

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

      {selectedEmployee ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedEmployee.fullName}</h2>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setSelectedEmployeeId(null)}
            >
              К списку
            </button>
          </div>

          <div className="profile-summary">
            {selectedEmployee.photoUrl ? (
              <img className="avatar-photo" src={selectedEmployee.photoUrl} alt={selectedEmployee.fullName} />
            ) : (
              <div className="profile-avatar large">{initials(selectedEmployee.fullName)}</div>
            )}
            <div>
              <p>
                <strong>Должность:</strong> {selectedEmployee.position}
              </p>
              <p>
                <strong>Возраст:</strong> {selectedEmployee.age}
              </p>
              <p>
                <strong>Телефон:</strong> {selectedEmployee.phone}
              </p>
              <p>
                <strong>Email:</strong> {selectedEmployee.email}
              </p>
              <p>
                <strong>Роль:</strong> {ROLE_LABELS[selectedEmployee.role]}
              </p>
              {canSeeCredentials ? (
                <>
                  <p>
                    <strong>Логин:</strong> {selectedEmployee.login}
                  </p>
                  <p>
                    <strong>Пароль:</strong> {selectedEmployee.password}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          {isAdmin ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setDraft(selectedEmployee)}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteEmployee(selectedEmployee.id)
                  setSelectedEmployeeId(null)
                }}
              >
                Удалить
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="tile-grid">
          {filteredEmployees.map((employee) => (
            <button
              type="button"
              key={employee.id}
              className="employee-tile"
              onClick={() => setSelectedEmployeeId(employee.id)}
            >
              {employee.photoUrl ? (
                <img className="avatar-photo" src={employee.photoUrl} alt={employee.fullName} />
              ) : (
                <div className="profile-avatar">{initials(employee.fullName)}</div>
              )}
              <strong>{employee.fullName}</strong>
              <p>{employee.position}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}


