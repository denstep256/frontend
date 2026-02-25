import { useMemo, useState, type FormEvent } from 'react'
import type { ClientCompany, EquipmentUnit, Product, Site, UserProfile } from '../types'
import { canManageEquipment, canManageSites, canViewSite } from '../utils/permissions'

interface SitesModuleProps {
  user: UserProfile
  sites: Site[]
  clients: ClientCompany[]
  equipment: EquipmentUnit[]
  selectedSiteId: string | null
  onSelectSite: (siteId: string | null) => void
  onUpsertSite: (site: Site) => Promise<void>
  onDeleteSite: (siteId: string) => Promise<void>
}

const allProducts: Product[] = ['MKD', 'Internet', 'IP-телефония']

function nextSiteId(sites: Site[]): string {
  const max = sites
    .map((site) => Number(site.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `site-${max + 1}`
}

function createEmptySite(sites: Site[], clientId: string): Site {
  return {
    id: nextSiteId(sites),
    address: '',
    clientId,
    products: ['Internet'],
    facility: [],
  }
}

export function SitesModule({
  user,
  sites,
  clients,
  equipment,
  selectedSiteId,
  onSelectSite,
  onUpsertSite,
  onDeleteSite,
}: SitesModuleProps) {
  const [siteDraft, setSiteDraft] = useState<Site | null>(null)
  const [clientFilter, setClientFilter] = useState('all')
  const [productFilter, setProductFilter] = useState<'all' | Product>('all')
  const [equipmentId, setEquipmentId] = useState('')
  const [equipmentCount, setEquipmentCount] = useState(1)

  const allowSiteManagement = canManageSites(user)
  const allowEquipmentManagement = canManageEquipment(user)

  const visibleSites = useMemo(
    () =>
      sites.filter((site) => {
        if (!canViewSite(user, site)) {
          return false
        }

        if (clientFilter !== 'all' && site.clientId !== clientFilter) {
          return false
        }

        if (productFilter !== 'all' && !site.products.includes(productFilter)) {
          return false
        }

        return true
      }),
    [sites, user, clientFilter, productFilter],
  )

  const selectedSite =
    (selectedSiteId ? visibleSites.find((site) => site.id === selectedSiteId) : null) ?? null

  async function saveSite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!siteDraft) {
      return
    }

    await onUpsertSite(siteDraft)
    onSelectSite(siteDraft.id)
    setSiteDraft(null)
  }

  function resolveClientName(clientId: string): string {
    return clients.find((client) => client.id === clientId)?.name ?? 'Клиент не найден'
  }

  function resolveEquipment(id: string): EquipmentUnit | null {
    return equipment.find((item) => item.id === id) ?? null
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Площадки и оборудование</h1>
        {allowSiteManagement && !selectedSite && !siteDraft ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              const safeClientId = user.clientId ?? clients[0]?.id ?? ''
              setSiteDraft(createEmptySite(sites, safeClientId))
              onSelectSite(null)
            }}
          >
            Добавить площадку
          </button>
        ) : null}
      </div>

      {siteDraft ? (
        <form className="inline-form" onSubmit={saveSite}>
          <h3>{selectedSite ? 'Редактирование площадки' : 'Новая площадка'}</h3>
          <div className="form-grid">
            <label>
              Клиент
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
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
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

      {selectedSite ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedSite.address}</h2>
            <button type="button" className="ghost-button button-sm" onClick={() => onSelectSite(null)}>
              К списку
            </button>
          </div>

          <p>
            <strong>Клиент:</strong> {resolveClientName(selectedSite.clientId)}
          </p>
          <p>
            <strong>Продукты:</strong> {selectedSite.products.join(', ') || 'Не выбраны'}
          </p>

          <h3>Предоставляемое оборудование</h3>
          <div className="cards-column">
            {selectedSite.facility.length > 0 ? (
              selectedSite.facility.map((item) => {
                const unit = resolveEquipment(item.equipmentId)

                return (
                  <div key={`${item.equipmentId}-${item.count}`} className="plain-card">
                    <p>
                      <strong>{unit?.name ?? 'Оборудование удалено'}</strong>
                    </p>
                    <p>Артикул: {unit?.article ?? '-'}</p>
                    <p>Количество: {item.count}</p>
                    <p>Продукт: {unit?.product ?? '-'}</p>
                    <p>Тип: {unit?.type ?? '-'}</p>
                    {allowEquipmentManagement ? (
                      <div className="section-head-row">
                        <button
                          type="button"
                          className="danger-button button-sm"
                          onClick={() => {
                            const nextFacility = selectedSite.facility.filter(
                              (facility) => facility.equipmentId !== item.equipmentId,
                            )

                            void onUpsertSite({
                              ...selectedSite,
                              facility: nextFacility,
                            })
                          }}
                        >
                          Удалить оборудование
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <p className="empty-inline">К оборудованию площадки пока ничего не привязано.</p>
            )}
          </div>

          {allowEquipmentManagement ? (
            <form
              className="inline-form compact"
              onSubmit={(event) => {
                event.preventDefault()
                if (!equipmentId) {
                  return
                }

                const nextFacility = [...selectedSite.facility]
                const existingIndex = nextFacility.findIndex((item) => item.equipmentId === equipmentId)

                if (existingIndex >= 0) {
                  nextFacility[existingIndex] = {
                    ...nextFacility[existingIndex],
                    count: equipmentCount,
                  }
                } else {
                  nextFacility.push({
                    equipmentId,
                    count: equipmentCount,
                  })
                }

                void onUpsertSite({
                  ...selectedSite,
                  facility: nextFacility,
                })
              }}
            >
              <h4>Привязать оборудование</h4>
              <div className="form-grid">
                <label>
                  Единица оборудования
                  <select
                    className="text-input"
                    value={equipmentId}
                    onChange={(event) => setEquipmentId(event.target.value)}
                    required
                  >
                    <option value="">Выберите оборудование</option>
                    {equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.product})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Количество
                  <input
                    className="text-input"
                    type="number"
                    min={1}
                    value={equipmentCount}
                    onChange={(event) => setEquipmentCount(Number(event.target.value))}
                  />
                </label>
              </div>

              <button className="primary-button button-sm" type="submit">
                Сохранить оборудование
              </button>
            </form>
          ) : null}

          {allowSiteManagement ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setSiteDraft(selectedSite)}
              >
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
      ) : (
        <>
          <div className="toolbar-row">
            <select
              className="text-input"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">Все клиенты</option>
              {clients
                .filter((client) => (user.role === 'client' ? client.id === user.clientId : true))
                .map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </select>

            <select
              className="text-input"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value as 'all' | Product)}
            >
              <option value="all">Все продукты</option>
              {allProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>

          <div className="cards-column">
            {visibleSites.map((site) => (
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
                <p>Клиент: {resolveClientName(site.clientId)}</p>
                <p>Единиц оборудования: {site.facility.length}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
