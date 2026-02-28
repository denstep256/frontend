import { useMemo, useState, type FormEvent } from 'react'
import type { ClientCompany, EquipmentUnit, Product, Site, UserProfile } from '../types'
import {
  canManageCustomerSites,
  canManageCustomers,
  canViewCustomer,
  canViewCustomerSite,
} from '../utils/permissions'

interface CustomersModuleProps {
  user: UserProfile
  customers: ClientCompany[]
  sites: Site[]
  equipment: EquipmentUnit[]
  selectedCustomerId: string | null
  selectedSiteId: string | null
  onSelectCustomer: (customerId: string | null) => void
  onSelectSite: (siteId: string | null) => void
  onUpsertCustomer: (customer: ClientCompany) => Promise<void>
  onDeleteCustomer: (customerId: string) => Promise<void>
  onUpsertSite: (site: Site) => Promise<void>
  onDeleteSite: (siteId: string) => Promise<void>
}

const allProducts: Product[] = ['MKD', 'Internet', 'IP-телефония']

function nextCustomerId(customers: ClientCompany[]): string {
  const max = customers
    .map((customer) => Number(customer.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `client-${max + 1}`
}

function nextSiteId(sites: Site[]): string {
  const max = sites
    .map((site) => Number(site.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `site-${max + 1}`
}

function createEmptyCustomer(customers: ClientCompany[]): ClientCompany {
  return {
    id: nextCustomerId(customers),
    name: '',
    address: '',
    phone: '',
    email: '',
    representatives: [],
    siteIds: [],
  }
}

function createEmptySite(sites: Site[], customerId: string): Site {
  return {
    id: nextSiteId(sites),
    address: '',
    clientId: customerId,
    products: ['Internet'],
    facility: [],
  }
}

export function CustomersModule({
  user,
  customers,
  sites,
  equipment,
  selectedCustomerId,
  selectedSiteId,
  onSelectCustomer,
  onSelectSite,
  onUpsertCustomer,
  onDeleteCustomer,
  onUpsertSite,
  onDeleteSite,
}: CustomersModuleProps) {
  const [customerDraft, setCustomerDraft] = useState<ClientCompany | null>(null)
  const [siteDraft, setSiteDraft] = useState<Site | null>(null)

  const canEditCustomers = canManageCustomers(user)
  const canEditSites = canManageCustomerSites(user)

  const visibleCustomers = useMemo(
    () => customers.filter((customer) => canViewCustomer(user, customer)),
    [customers, user],
  )

  const visibleSites = useMemo(
    () => sites.filter((site) => canViewCustomerSite(user, site)),
    [sites, user],
  )

  const selectedCustomer =
    (selectedCustomerId
      ? visibleCustomers.find((customer) => customer.id === selectedCustomerId)
      : null) ?? null

  const selectedSite =
    (selectedSiteId ? visibleSites.find((site) => site.id === selectedSiteId) : null) ?? null

  const selectedCustomerSites = selectedCustomer
    ? visibleSites.filter((site) => site.clientId === selectedCustomer.id)
    : []

  function resolveEquipment(itemId: string): EquipmentUnit | null {
    return equipment.find((item) => item.id === itemId) ?? null
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!customerDraft) {
      return
    }

    await onUpsertCustomer(customerDraft)
    onSelectCustomer(customerDraft.id)
    setCustomerDraft(null)
  }

  async function saveSite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!siteDraft) {
      return
    }

    await onUpsertSite(siteDraft)
    onSelectCustomer(siteDraft.clientId)
    onSelectSite(siteDraft.id)
    setSiteDraft(null)
  }

  if (visibleCustomers.length === 0 && !canEditCustomers) {
    return (
      <section className="module-wrap">
        <h1>Заказчики</h1>
        <p className="empty-state">Для текущей роли нет доступных заказчиков.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Заказчики</h1>
        {canEditCustomers && !selectedCustomer && !selectedSite && !customerDraft && !siteDraft ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setCustomerDraft(createEmptyCustomer(customers))
              onSelectCustomer(null)
              onSelectSite(null)
            }}
          >
            Добавить заказчика
          </button>
        ) : null}
      </div>

      {customerDraft ? (
        <form className="inline-form" onSubmit={saveCustomer}>
          <h3>{selectedCustomer ? 'Редактирование заказчика' : 'Новый заказчик'}</h3>

          <div className="form-grid">
            <label>
              Название компании
              <input
                className="text-input"
                value={customerDraft.name}
                onChange={(event) =>
                  setCustomerDraft((previous) =>
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
                value={customerDraft.address}
                onChange={(event) =>
                  setCustomerDraft((previous) =>
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
                value={customerDraft.phone}
                onChange={(event) =>
                  setCustomerDraft((previous) =>
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
                value={customerDraft.email}
                onChange={(event) =>
                  setCustomerDraft((previous) =>
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
            <button type="button" className="ghost-button button-sm" onClick={() => setCustomerDraft(null)}>
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {siteDraft ? (
        <form className="inline-form" onSubmit={saveSite}>
          <h3>{selectedSite ? 'Редактирование площадки' : 'Новая площадка'}</h3>

          <div className="form-grid">
            <label>
              Заказчик
              <select
                className="text-input"
                value={siteDraft.clientId}
                onChange={(event) =>
                  setSiteDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          clientId: event.target.value,
                        }
                      : previous,
                  )
                }
              >
                {visibleCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Адрес площадки
              <input
                className="text-input"
                value={siteDraft.address}
                onChange={(event) =>
                  setSiteDraft((previous) =>
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
              Продукты
              <select
                multiple
                size={3}
                className="text-input products-multi"
                value={siteDraft.products}
                onChange={(event) => {
                  const selectedProducts = Array.from(event.target.selectedOptions).map(
                    (option) => option.value as Product,
                  )

                  setSiteDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          products: selectedProducts,
                        }
                      : previous,
                  )
                }}
              >
                {allProducts.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="section-head-row">
            <button type="submit" className="primary-button button-sm">
              Сохранить
            </button>
            <button type="button" className="ghost-button button-sm" onClick={() => setSiteDraft(null)}>
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {selectedSite && selectedCustomer ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedSite.address}</h2>
            <button type="button" className="ghost-button button-sm" onClick={() => onSelectSite(null)}>
              К карточке заказчика
            </button>
          </div>

          <p>
            <strong>Заказчик:</strong> {selectedCustomer.name}
          </p>
          <p>
            <strong>Продукты:</strong> {selectedSite.products.join(', ') || 'Не выбраны'}
          </p>

          <h3>Оборудование на площадке</h3>
          <div className="cards-column">
            {selectedSite.facility.length > 0 ? (
              selectedSite.facility.map((facility) => {
                const unit = resolveEquipment(facility.equipmentId)

                return (
                  <div key={`${facility.equipmentId}-${facility.count}`} className="plain-card">
                    <p>
                      <strong>{unit?.name ?? 'Оборудование удалено'}</strong>
                    </p>
                    <p>Артикул: {unit?.article ?? '-'}</p>
                    <p>Количество: {facility.count}</p>
                    <p>Продукт: {unit?.product ?? '-'}</p>
                    <p>Тип: {unit?.type ?? '-'}</p>
                  </div>
                )
              })
            ) : (
              <p className="empty-inline">На площадке пока нет оборудования.</p>
            )}
          </div>

          {canEditSites ? (
            <div className="section-head-row">
              <button type="button" className="primary-button button-sm" onClick={() => setSiteDraft(selectedSite)}>
                Редактировать площадку
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteSite(selectedSite.id)
                  onSelectSite(null)
                }}
              >
                Удалить площадку
              </button>
            </div>
          ) : null}
        </article>
      ) : selectedCustomer ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedCustomer.name}</h2>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => {
                onSelectCustomer(null)
                onSelectSite(null)
              }}
            >
              К списку
            </button>
          </div>

          <div className="data-columns">
            <div>
              <p>
                <strong>Адрес:</strong> {selectedCustomer.address}
              </p>
              <p>
                <strong>Телефон:</strong> {selectedCustomer.phone}
              </p>
              <p>
                <strong>Email:</strong> {selectedCustomer.email}
              </p>
            </div>
          </div>

          <div className="section-head-row">
            <h3>Представители заказчика</h3>
          </div>

          <div className="cards-column">
            {selectedCustomer.representatives.length > 0 ? (
              selectedCustomer.representatives.map((representative) => (
                <div key={representative.id} className="plain-card">
                  <p>
                    <strong>{representative.name}</strong>
                  </p>
                  <p>{representative.phone}</p>
                  <p>{representative.email}</p>
                </div>
              ))
            ) : (
              <p className="empty-inline">У компании пока нет представителей.</p>
            )}
          </div>

          <div className="section-head-row">
            <h3>Площадки заказчика</h3>
            {canEditSites ? (
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setSiteDraft(createEmptySite(sites, selectedCustomer.id))}
              >
                Добавить площадку
              </button>
            ) : null}
          </div>

          <div className="cards-column">
            {selectedCustomerSites.length > 0 ? (
              selectedCustomerSites.map((site) => (
                <button
                  type="button"
                  key={site.id}
                  className="appeal-card"
                  onClick={() => onSelectSite(site.id)}
                >
                  <div className="card-row">
                    <strong>{site.address}</strong>
                    <span>{site.products.join(', ') || 'Без продуктов'}</span>
                  </div>
                  <p>Единиц оборудования: {site.facility.length}</p>
                </button>
              ))
            ) : (
              <p className="empty-inline">У заказчика пока нет площадок.</p>
            )}
          </div>

          {canEditCustomers ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setCustomerDraft(selectedCustomer)}
              >
                Редактировать заказчика
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteCustomer(selectedCustomer.id)
                  onSelectCustomer(null)
                  onSelectSite(null)
                }}
              >
                Удалить заказчика
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="cards-column">
          {visibleCustomers.map((customer) => (
            <button
              type="button"
              key={customer.id}
              className="appeal-card"
              onClick={() => onSelectCustomer(customer.id)}
            >
              <div className="card-row">
                <strong>{customer.name}</strong>
                <span>{customer.representatives.length} представителя</span>
              </div>
              <p>{customer.address}</p>
              <p>{customer.phone}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
