import { useMemo, useState, type FormEvent } from 'react'
import { PRIORITY_DEADLINE_DAYS, STATUS_LABELS, STATUS_ORDER } from '../constants'
import type {
  Appeal,
  AppealPriority,
  AppealStatus,
  ClientCompany,
  Employee,
  FileAttachment,
  Product,
  Site,
  UserProfile,
} from '../types'
import { formatBytes, formatDate, formatDateTime, truncate } from '../utils/format'
import {
  canAssignResponsible,
  canChangeStatus,
  canCreateAppealType,
  canEditAppeal,
  canLinkAppeals,
  canViewAppeal,
} from '../utils/permissions'
import { CustomSelect } from '../components/CustomSelect'

interface AppealsModuleProps {
  user: UserProfile
  appeals: Appeal[]
  employees: Employee[]
  clients: ClientCompany[]
  sites: Site[]
  selectedAppealId: string | null
  onSelectAppeal: (appealId: string | null) => void
  onCreateAppeal: (draft: Omit<Appeal, 'id'>) => Promise<void>
  onUpdateAppeal: (appealId: string, patch: Partial<Appeal>) => Promise<void>
  onAddComment: (appealId: string, text: string, files: FileAttachment[]) => Promise<void>
  onLinkAppeal: (appealId: string, linkedAppealId: string) => Promise<void>
  onUnlinkAppeal: (appealId: string, linkedAppealId: string) => Promise<void>
  onOpenSite: (siteId: string) => void
  onOpenCustomer: (clientId: string) => void
}

type CreateFormState = {
  type: Appeal['type']
  description: string
  priority: AppealPriority
  product: Product
  clientId: string
  siteId: string
}

const products: Product[] = ['MKD', 'Internet', 'IP-телефония']

function toDeadline(priority: AppealPriority): string {
  const milliseconds = PRIORITY_DEADLINE_DAYS[priority] * 24 * 60 * 60 * 1000
  return new Date(Date.now() + milliseconds).toISOString()
}

function toDateTimeInput(isoDate: string): string {
  const date = new Date(isoDate)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString()
}

function nextAppealTitle(type: Appeal['type'], appeals: Appeal[]): { crmNumber: string; title: string } {
  const prefix = type === 'KTP' ? 'CRM' : 'Наряд'

  const number =
    appeals
      .map((appeal) => {
        if (!appeal.crmNumber.startsWith(prefix)) {
          return 0
        }

        const safeNumber = Number(appeal.crmNumber.split('-')[1])
        return Number.isFinite(safeNumber) ? safeNumber : 0
      })
      .reduce((max, current) => Math.max(max, current), 0) + 1

  const crmNumber = `${prefix}-${number}`
  return { crmNumber, title: crmNumber }
}

function resolveClientDefaultProduct(clientId: string, sites: Site[]): Product {
  const siteWithProducts = sites.find((site) => site.clientId === clientId && site.products.length > 0)
  return siteWithProducts?.products[0] ?? 'Internet'
}

function defaultCreateState(user: UserProfile, clients: ClientCompany[], sites: Site[]): CreateFormState {
  const firstClientId = user.clientId ?? clients[0]?.id ?? ''
  const firstSiteId = user.clientId
    ? clients.find((client) => client.id === user.clientId)?.siteIds[0] ?? ''
    : clients[0]?.siteIds[0] ?? ''
  const clientProduct = firstClientId ? resolveClientDefaultProduct(firstClientId, sites) : 'Internet'

  return {
    type: user.role === 'client' ? 'KTP' : (user.role === 'engineer_wfm' ? 'WFM' : 'KTP'),
    description: '',
    priority: 'Basic',
    product: clientProduct,
    clientId: firstClientId,
    siteId: firstSiteId,
  }
}

function getResponsibleCandidates(
  user: UserProfile,
  employees: Employee[],
  selectedAppeal: Appeal,
): Employee[] {
  if (user.role === 'admin') {
    return employees
  }

  if (user.role === 'operator_ktp') {
    return employees.filter((employee) => employee.role === 'engineer_wfm')
  }

  if (user.role === 'engineer_wfm') {
    return employees.filter((employee) => employee.role === 'operator_ktp')
  }

  return selectedAppeal.responsibleId
    ? employees.filter((employee) => employee.id === selectedAppeal.responsibleId)
    : []
}

export function AppealsModule({
  user,
  appeals,
  employees,
  clients,
  sites,
  selectedAppealId,
  onSelectAppeal,
  onCreateAppeal,
  onUpdateAppeal,
  onAddComment,
  onLinkAppeal,
  onUnlinkAppeal,
  onOpenSite,
  onOpenCustomer,
}: AppealsModuleProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<CreateFormState>(() =>
    defaultCreateState(user, clients, sites),
  )
  const [isCommentPreview, setIsCommentPreview] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [linkedAppealCandidate, setLinkedAppealCandidate] = useState('')
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AppealStatus>>({})

  const visibleAppeals = useMemo(
    () =>
      appeals
        .filter((appeal) => canViewAppeal(user, appeal))
        .sort((left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [appeals, user],
  )

  const selectedAppeal = visibleAppeals.find((appeal) => appeal.id === selectedAppealId) ?? null
  const statusDraft = selectedAppeal
    ? statusDrafts[selectedAppeal.id] ?? selectedAppeal.status
    : 'Created'

  const selectedClientSites = sites.filter((site) => {
    if (!createState.clientId) {
      return false
    }

    return site.clientId === createState.clientId
  })

  const availableLinkTargets = selectedAppeal
    ? visibleAppeals.filter(
        (appeal) =>
          appeal.id !== selectedAppeal.id && !selectedAppeal.linkedAppealIds.includes(appeal.id),
      )
    : []

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    const type = createState.type
    if (!canCreateAppealType(user, type)) {
      return
    }

    const now = new Date().toISOString()
    const clientId = user.role === 'client' ? user.clientId ?? createState.clientId : createState.clientId
    const selectedSite =
      sites.find((site) => site.id === createState.siteId && site.clientId === clientId) ?? null
    const fallbackClientProduct = resolveClientDefaultProduct(clientId, sites)
    const autoClientProduct = selectedSite?.products[0] ?? fallbackClientProduct
    const { crmNumber, title } = nextAppealTitle(type, appeals)

    const draft: Omit<Appeal, 'id'> = {
      crmNumber,
      title,
      type,
      description: createState.description,
      status: 'Created',
      priority: createState.priority,
      product: user.role === 'client' ? autoClientProduct : createState.product,
      clientId,
      representativeId: user.representativeId,
      siteId: createState.siteId || undefined,
      responsibleId: undefined,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
      deadline: toDeadline(createState.priority),
      linkedAppealIds: [],
      comments: [],
    }

    await onCreateAppeal(draft)
    setCreateState(defaultCreateState(user, clients, sites))
    setIsCreateOpen(false)
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!selectedAppeal || !commentText.trim()) {
      return
    }

    const files: FileAttachment[] = commentFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
    }))

    await onAddComment(selectedAppeal.id, commentText.trim(), files)
    setCommentText('')
    setCommentFiles([])
    setIsCommentPreview(false)
  }

  async function handleLinkAppeal(): Promise<void> {
    if (!selectedAppeal || !linkedAppealCandidate) {
      return
    }

    await onLinkAppeal(selectedAppeal.id, linkedAppealCandidate)
    setLinkedAppealCandidate('')
  }

  async function handleUnlinkAppeal(linkedId: string): Promise<void> {
    if (!selectedAppeal) {
      return
    }

    await onUnlinkAppeal(selectedAppeal.id, linkedId)
  }

  function resolveEmployeeName(employeeId?: string): string {
    if (!employeeId) {
      return 'Не назначен'
    }

    return employees.find((employee) => employee.id === employeeId)?.fullName ?? 'Не назначен'
  }

  function resolveClientName(clientId: string): string {
    return clients.find((client) => client.id === clientId)?.name ?? 'Клиент не найден'
  }

  function resolveSiteAddress(siteId?: string): string {
    if (!siteId) {
      return 'Не выбрана'
    }

    return sites.find((site) => site.id === siteId)?.address ?? 'Площадка не найдена'
  }

  function applyStatusUpdate(nextStatus: AppealStatus): void {
    if (!selectedAppeal || !canChangeStatus(user, selectedAppeal, nextStatus)) {
      return
    }

    setStatusDrafts((previous) => ({
      ...previous,
      [selectedAppeal.id]: nextStatus,
    }))

    void onUpdateAppeal(selectedAppeal.id, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
  }

  function updatePriority(nextPriority: AppealPriority): void {
    if (!selectedAppeal) {
      return
    }

    void onUpdateAppeal(selectedAppeal.id, {
      priority: nextPriority,
      updatedAt: new Date().toISOString(),
    })
  }

  function updateResponsible(nextResponsibleId: string): void {
    if (!selectedAppeal) {
      return
    }

    const newStatus = nextResponsibleId && !selectedAppeal.responsibleId ? 'Opened' : selectedAppeal.status

    void onUpdateAppeal(selectedAppeal.id, {
      responsibleId: nextResponsibleId || undefined,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })
  }

  function updateDeadline(nextDeadline: string): void {
    if (!selectedAppeal) {
      return
    }

    void onUpdateAppeal(selectedAppeal.id, {
      deadline: fromDateTimeInput(nextDeadline),
      updatedAt: new Date().toISOString(),
    })
  }

  if (visibleAppeals.length === 0) {
    return (
      <section className="module-wrap">
        <div className="module-title-row">
          <h1>Обращения</h1>
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setCreateState(defaultCreateState(user, clients, sites))
              setIsCreateOpen((value) => !value)
            }}
          >
            {isCreateOpen ? 'Скрыть форму' : 'Создать обращение'}
          </button>
        </div>

        <p className="empty-state">У вас пока нет доступных обращений.</p>
      </section>
    )
  }

  if (selectedAppeal) {
    const canEdit = canEditAppeal(user, selectedAppeal)
    const canLink = canLinkAppeals(user)
    const canAssign = canAssignResponsible(user, selectedAppeal)
    const baseCandidates = getResponsibleCandidates(user, employees, selectedAppeal)
    const currentResponsible = selectedAppeal.responsibleId
      ? employees.find((employee) => employee.id === selectedAppeal.responsibleId)
      : null
    const responsibleCandidates =
      currentResponsible && !baseCandidates.some((employee) => employee.id === currentResponsible.id)
        ? [currentResponsible, ...baseCandidates]
        : baseCandidates
    const linkedAppeals = selectedAppeal.linkedAppealIds
      .map((appealId) => visibleAppeals.find((item) => item.id === appealId))
      .filter((appeal): appeal is Appeal => Boolean(appeal))
    const canApplyDraftStatus =
      canChangeStatus(user, selectedAppeal, statusDraft) && statusDraft !== selectedAppeal.status
    const canClientConfirm =
      user.role === 'client' &&
      selectedAppeal.status === 'Done' &&
      canChangeStatus(user, selectedAppeal, 'Verified')

    return (
      <section className="module-wrap">
        <div className="module-title-row">
          <button type="button" className="ghost-button button-sm" onClick={() => onSelectAppeal(null)}>
            К списку
          </button>
          <h1>{selectedAppeal.crmNumber}</h1>
        </div>

        <div className="appeal-detail-grid">
          <article className="detail-main">
            <p className="meta">{selectedAppeal.type === 'KTP' ? 'Тикет КТП' : 'Наряд WFM'}</p>
            <h2>{selectedAppeal.title}</h2>
            <p className="description-full">{selectedAppeal.description}</p>

            <div className="linked-block">
              <div className="section-head-row">
                <h3>Связанные обращения</h3>
                {canLink ? (
                  <div className="link-control-row compact">
                    <CustomSelect
                      value={linkedAppealCandidate}
                      onChange={(event) => setLinkedAppealCandidate(event.target.value)}
                      options={[
                        { value: '', label: 'Выбрать' },
                        ...availableLinkTargets.map((appeal) => ({
                          value: appeal.id,
                          label: appeal.crmNumber,
                        })),
                      ]}
                      placeholder="Выберите обращение"
                    />
                    <button
                      type="button"
                      className="primary-button button-sm"
                      disabled={!linkedAppealCandidate}
                      onClick={() => {
                        void handleLinkAppeal()
                      }}
                    >
                      Добавить
                    </button>
                  </div>
                ) : null}
              </div>

              {linkedAppeals.length > 0 ? (
                <div className="linked-appeals-grid">
                  {linkedAppeals.map((appeal) => (
                    <article key={appeal.id} className="linked-appeal-card">
                      <div className="card-row">
                        <strong>{appeal.crmNumber}</strong>
                        <span className="status-pill">{STATUS_LABELS[appeal.status]}</span>
                      </div>
                      <p>
                        Тип: {appeal.type} | Критичность: {appeal.priority}
                      </p>
                      <p>Обновлено: {formatDateTime(appeal.updatedAt)}</p>
                      <div className="section-head-row">
                        <button
                          type="button"
                          className="ghost-button button-sm"
                          onClick={() => onSelectAppeal(appeal.id)}
                        >
                          Открыть
                        </button>
                        {canLink ? (
                          <button
                            type="button"
                            className="danger-button button-sm"
                            onClick={() => {
                              void handleUnlinkAppeal(appeal.id)
                            }}
                          >
                            Удалить связь
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-inline">Связанных обращений пока нет.</p>
              )}
            </div>

            <div className="comments-block">
              <h3>Комментарии</h3>

              <div className="comment-list">
                {selectedAppeal.comments.length > 0 ? (
                  selectedAppeal.comments
                    .slice()
                    .sort(
                      (left, right) =>
                        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
                    )
                    .map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-meta">
                          <strong>{comment.authorName}</strong>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p>{comment.text}</p>
                        {comment.files.length > 0 ? (
                          <ul className="file-list">
                            {comment.files.map((file) => (
                              <li key={file.id}>
                                {file.name} ({formatBytes(file.size)})
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))
                ) : (
                  <p className="empty-inline">Комментариев пока нет.</p>
                )}
              </div>

              <form className="comment-form" onSubmit={handleCommentSubmit}>
                <div className="section-head-row">
                  <h4>Новый комментарий</h4>
                  <button
                    type="button"
                    className="ghost-button button-sm"
                    onClick={() => setIsCommentPreview((value) => !value)}
                  >
                    {isCommentPreview ? 'Редактировать' : 'Предпросмотр'}
                  </button>
                </div>

                {isCommentPreview ? (
                  <pre className="preview-box">{commentText || 'Пустой комментарий'}</pre>
                ) : (
                  <textarea
                    className="text-input text-area"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Поддерживается Markdown-разметка"
                    rows={5}
                    required
                  />
                )}

                <input
                  className="text-input"
                  type="file"
                  multiple
                  onChange={(event) => {
                    const files = event.target.files ? Array.from(event.target.files) : []
                    setCommentFiles(files)
                  }}
                />

                {commentFiles.length > 0 ? (
                  <ul className="file-list compact">
                    {commentFiles.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        {file.name} ({formatBytes(file.size)})
                      </li>
                    ))}
                  </ul>
                ) : null}

                <button type="submit" className="primary-button button-sm">
                  Отправить комментарий
                </button>
              </form>
            </div>
          </article>

          <aside className="detail-side">
            <h3>Характеристики</h3>

            <div className="side-row">
              <span>Статус</span>
              <CustomSelect
                value={statusDraft}
                onChange={(event) => {
                  if (!selectedAppeal) {
                    return
                  }

                  setStatusDrafts((previous) => ({
                    ...previous,
                    [selectedAppeal.id]: event.target.value as AppealStatus,
                  }))
                }}
                options={STATUS_ORDER.map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                  disabled: !canChangeStatus(user, selectedAppeal, status),
                }))}
                placeholder="Выберите статус"
                disabled={!canEdit}
              />
            </div>

            <div className="side-row">
              <span>Обновление состояния</span>
              <div className="section-head-row compact-actions">
                <button
                  type="button"
                  className="primary-button button-sm"
                  onClick={() => applyStatusUpdate(statusDraft)}
                  disabled={!canApplyDraftStatus}
                >
                  Обновить статус
                </button>
                {canClientConfirm ? (
                  <button
                    type="button"
                    className="primary-button button-sm"
                    onClick={() => applyStatusUpdate('Verified')}
                  >
                    Подтвердить выполнение
                  </button>
                ) : null}
              </div>
            </div>

            <div className="side-row">
              <span>Критичность</span>
              <CustomSelect
                value={selectedAppeal.priority}
                onChange={(event) => updatePriority(event.target.value as AppealPriority)}
                options={[
                  { value: 'Basic', label: 'Базовая' },
                  { value: 'Important', label: 'Важная' },
                  { value: 'Critical', label: 'Критичная' },
                ]}
                placeholder="Выберите критичность"
                disabled={!canEdit}
              />
            </div>

            <div className="side-row">
              <span>Продукт</span>
              <strong>{selectedAppeal.product}</strong>
            </div>

            <div className="side-row">
              <span>Ответственный</span>
              <CustomSelect
                value={selectedAppeal.responsibleId ?? ''}
                onChange={(event) => updateResponsible(event.target.value)}
                options={[
                  { value: '', label: 'Не назначен' },
                  ...responsibleCandidates.map((employee) => ({
                    value: employee.id,
                    label: employee.fullName,
                  })),
                ]}
                placeholder="Выберите ответственного"
                disabled={!canAssign}
              />
              {(user.role === 'operator_ktp' || user.role === 'engineer_wfm') && canAssign ? (
                <small className="meta">Переназначение доступно только в другой отдел.</small>
              ) : null}
            </div>

            <div className="side-row">
              <span>Площадка заказчика</span>
              {selectedAppeal.siteId ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => onOpenSite(selectedAppeal.siteId as string)}
                >
                  {resolveSiteAddress(selectedAppeal.siteId)}
                </button>
              ) : (
                <strong>Не выбрана</strong>
              )}
            </div>

            <div className="side-row">
              <span>Клиент</span>
              <button
                type="button"
                className="link-button"
                onClick={() => onOpenCustomer(selectedAppeal.clientId)}
              >
                {resolveClientName(selectedAppeal.clientId)}
              </button>
            </div>

            <div className="side-row">
              <span>Deadline</span>
              {canEdit ? (
                <input
                  className="text-input"
                  type="datetime-local"
                  value={toDateTimeInput(selectedAppeal.deadline)}
                  onChange={(event) => updateDeadline(event.target.value)}
                />
              ) : (
                <strong>{formatDate(selectedAppeal.deadline)}</strong>
              )}
            </div>

            <div className="side-row">
              <span>Обновлено</span>
              <strong>{formatDateTime(selectedAppeal.updatedAt)}</strong>
            </div>
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Обращения</h1>
        <button
          type="button"
          className="primary-button button-sm"
          onClick={() => {
            setCreateState(defaultCreateState(user, clients, sites))
            setIsCreateOpen((value) => !value)
          }}
        >
          {isCreateOpen ? 'Скрыть форму' : 'Создать обращение'}
        </button>
      </div>

      {isCreateOpen ? (
        <form className="inline-form" onSubmit={handleCreate}>
          <div className="form-grid">
            {user.role !== 'client' ? (
              <label>
                Тип
                <CustomSelect
                  value={createState.type}
                  onChange={(event) =>
                    setCreateState((previous) => ({
                      ...previous,
                      type: event.target.value as Appeal['type'],
                    }))
                  }
                  options={[
                    { value: 'KTP', label: 'КТП', disabled: !canCreateAppealType(user, 'KTP') },
                    { value: 'WFM', label: 'WFM', disabled: !canCreateAppealType(user, 'WFM') },
                  ]}
                  placeholder={null}
                  showPlaceholder={false}
                />
              </label>
            ) : null}

            <label>
              Критичность
              <CustomSelect
                value={createState.priority}
                onChange={(event) =>
                  setCreateState((previous) => ({
                    ...previous,
                    priority: event.target.value as AppealPriority,
                  }))
                }
                options={[
                  { value: 'Basic', label: 'Базовая' },
                  { value: 'Important', label: 'Важная' },
                  { value: 'Critical', label: 'Критичная' },
                ]}
                placeholder={null}
                showPlaceholder={false}
              />
            </label>

            {user.role !== 'client' ? (
              <label>
                Продукт
                <CustomSelect
                  value={createState.product}
                  onChange={(event) =>
                    setCreateState((previous) => ({
                      ...previous,
                      product: event.target.value as Product,
                    }))
                  }
                  options={products.map((product) => ({
                    value: product,
                    label: product,
                  }))}
                  placeholder={null}
                  showPlaceholder={false}
                />
              </label>
            ) : null}

            {user.role !== 'client' ? (
              <label>
                Клиент
                <CustomSelect
                  value={createState.clientId}
                  onChange={(event) =>
                    setCreateState((previous) => ({
                      ...previous,
                      clientId: event.target.value,
                      siteId: '',
                    }))
                  }
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.name,
                  }))}
                  placeholder={null}
                  showPlaceholder={false}
                />
              </label>
            ) : null}

            <label>
              Площадка
              <CustomSelect
                value={createState.siteId}
                onChange={(event) =>
                  setCreateState((previous) => {
                    const nextSiteId = event.target.value
                    const nextSite = selectedClientSites.find((site) => site.id === nextSiteId)
                    return {
                      ...previous,
                      siteId: nextSiteId,
                      product:
                        user.role === 'client'
                          ? nextSite?.products[0] ?? previous.product
                          : previous.product,
                    }
                  })
                }
                options={[
                  { value: '', label: 'Не выбрана' },
                  ...selectedClientSites.map((site) => ({
                    value: site.id,
                    label: site.address,
                  })),
                ]}
                placeholder={null}
                showPlaceholder={false}
              />
            </label>
          </div>

          <label>
            Описание
            <textarea
              className="text-input text-area"
              rows={4}
              value={createState.description}
              onChange={(event) =>
                setCreateState((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              required
            />
          </label>

          <button className="primary-button button-sm" type="submit">
            Сохранить
          </button>
        </form>
      ) : null}

      <div className="cards-column">
        {visibleAppeals.map((appeal) => (
          <button
            type="button"
            key={appeal.id}
            className="appeal-card"
            onClick={() => onSelectAppeal(appeal.id)}
          >
            <div className="card-row">
              <strong>{appeal.crmNumber}</strong>
              <span>{appeal.status}</span>
            </div>
            <h3>{appeal.title}</h3>
            <p>{truncate(appeal.description, 100)}</p>
            <div className="card-row muted">
              <span>Ответственный: {resolveEmployeeName(appeal.responsibleId)}</span>
              <span>Обновлено: {formatDateTime(appeal.updatedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}



