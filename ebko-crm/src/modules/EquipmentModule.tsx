import { useMemo, useState, type FormEvent } from 'react'
import type { EquipmentType, EquipmentUnit, Product, UserProfile } from '../types'
import { canEditEquipment, canViewEquipment } from '../utils/permissions'

interface EquipmentModuleProps {
  user: UserProfile
  equipment: EquipmentUnit[]
  onUpsertEquipment: (equipment: EquipmentUnit) => Promise<void>
  onDeleteEquipment: (equipmentId: string) => Promise<void>
}

const allProducts: Product[] = ['MKD', 'Internet', 'IP-телефония']
const allEquipmentTypes: EquipmentType[] = [
  'Абонентское',
  'Пассивные сетевые установки',
  'Системы коммутации',
  'ПО',
]

function nextEquipmentId(equipment: EquipmentUnit[]): string {
  const max = equipment
    .map((item) => Number(item.id.split('-').at(-1) ?? 0))
    .reduce((left, right) => Math.max(left, right), 0)

  return `eq-${max + 1}`
}

function productPrefix(product: Product): string {
  if (product === 'MKD') {
    return '1001'
  }

  if (product === 'Internet') {
    return '2002'
  }

  return '3003'
}

function nextArticle(product: Product, equipment: EquipmentUnit[]): string {
  const prefix = productPrefix(product)
  const maxTail = equipment
    .filter((item) => item.product === product && item.article.startsWith(prefix))
    .map((item) => Number(item.article.slice(4)))
    .reduce((left, right) => Math.max(left, Number.isFinite(right) ? right : 0), 0)

  return `${prefix}${String(maxTail + 1).padStart(10, '0')}`
}

function createEmptyEquipment(equipment: EquipmentUnit[]): EquipmentUnit {
  const product: Product = 'Internet'

  return {
    id: nextEquipmentId(equipment),
    article: nextArticle(product, equipment),
    product,
    type: 'Абонентское',
    weightKg: 1,
    name: '',
    description: '',
    totalCount: 1,
  }
}

export function EquipmentModule({
  user,
  equipment,
  onUpsertEquipment,
  onDeleteEquipment,
}: EquipmentModuleProps) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentUnit | null>(null)
  const [search, setSearch] = useState('')

  const canEdit = canEditEquipment(user)

  const visibleEquipment = useMemo(
    () => (canViewEquipment(user) ? equipment : []),
    [equipment, user],
  )

  const filteredEquipment = useMemo(() => {
    if (!search.trim()) {
      return visibleEquipment
    }

    const normalized = search.toLowerCase()
    return visibleEquipment.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.article.toLowerCase().includes(normalized) ||
        item.product.toLowerCase().includes(normalized) ||
        item.type.toLowerCase().includes(normalized)
      )
    })
  }, [search, visibleEquipment])

  const selectedEquipment =
    (selectedEquipmentId
      ? visibleEquipment.find((item) => item.id === selectedEquipmentId)
      : null) ?? null

  async function saveEquipment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!equipmentDraft) {
      return
    }

    const safeDraft: EquipmentUnit = {
      ...equipmentDraft,
      weightKg: Math.max(0.1, Number(equipmentDraft.weightKg) || 0.1),
      totalCount: Math.max(1, Number(equipmentDraft.totalCount) || 1),
    }

    await onUpsertEquipment(safeDraft)
    setSelectedEquipmentId(safeDraft.id)
    setEquipmentDraft(null)
  }

  if (user.role === 'client') {
    return (
      <section className="module-wrap">
        <h1>Оборудование</h1>
        <p className="empty-state">У роли Клиент нет доступа к модулю оборудования.</p>
      </section>
    )
  }

  return (
    <section className="module-wrap">
      <div className="module-title-row">
        <h1>Оборудование</h1>
        {canEdit && !selectedEquipment && !equipmentDraft ? (
          <button
            type="button"
            className="primary-button button-sm"
            onClick={() => {
              setEquipmentDraft(createEmptyEquipment(equipment))
              setSelectedEquipmentId(null)
            }}
          >
            Добавить оборудование
          </button>
        ) : null}
      </div>

      {!selectedEquipment && !equipmentDraft ? (
        <input
          className="text-input"
          placeholder="Поиск по названию, артикулу, продукту"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {equipmentDraft ? (
        <form className="inline-form" onSubmit={saveEquipment}>
          <h3>{selectedEquipment ? 'Редактирование оборудования' : 'Новая единица оборудования'}</h3>

          <div className="form-grid">
            <label>
              Продукт
              <select
                className="text-input"
                value={equipmentDraft.product}
                onChange={(event) =>
                  setEquipmentDraft((previous) => {
                    if (!previous) {
                      return previous
                    }

                    const nextProduct = event.target.value as Product
                    const shouldRegenerateArticle =
                      previous.article === '' || previous.article.startsWith(productPrefix(previous.product))

                    return {
                      ...previous,
                      product: nextProduct,
                      article: shouldRegenerateArticle
                        ? nextArticle(nextProduct, equipment.filter((item) => item.id !== previous.id))
                        : previous.article,
                    }
                  })
                }
              >
                {allProducts.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Артикул
              <input
                className="text-input"
                value={equipmentDraft.article}
                onChange={(event) =>
                  setEquipmentDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          article: event.target.value,
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Тип
              <select
                className="text-input"
                value={equipmentDraft.type}
                onChange={(event) =>
                  setEquipmentDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          type: event.target.value as EquipmentType,
                        }
                      : previous,
                  )
                }
              >
                {allEquipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Вес (кг)
              <input
                className="text-input"
                type="number"
                min={0.1}
                step={0.1}
                value={equipmentDraft.weightKg}
                onChange={(event) =>
                  setEquipmentDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          weightKg: Number(event.target.value),
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Количество
              <input
                className="text-input"
                type="number"
                min={1}
                value={equipmentDraft.totalCount}
                onChange={(event) =>
                  setEquipmentDraft((previous) =>
                    previous
                      ? {
                          ...previous,
                          totalCount: Number(event.target.value),
                        }
                      : previous,
                  )
                }
                required
              />
            </label>

            <label>
              Название
              <input
                className="text-input"
                value={equipmentDraft.name}
                onChange={(event) =>
                  setEquipmentDraft((previous) =>
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
          </div>

          <label>
            Описание
            <textarea
              className="text-input text-area"
              rows={4}
              value={equipmentDraft.description}
              onChange={(event) =>
                setEquipmentDraft((previous) =>
                  previous
                    ? {
                        ...previous,
                        description: event.target.value,
                      }
                    : previous,
                )
              }
              required
            />
          </label>

          <div className="section-head-row">
            <button type="submit" className="primary-button button-sm">
              Сохранить
            </button>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setEquipmentDraft(null)}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {selectedEquipment ? (
        <article className="details-screen">
          <div className="module-title-row">
            <h2>{selectedEquipment.name}</h2>
            <button
              type="button"
              className="ghost-button button-sm"
              onClick={() => setSelectedEquipmentId(null)}
            >
              К списку
            </button>
          </div>

          <div className="data-columns">
            <div>
              <p>
                <strong>Артикул:</strong> {selectedEquipment.article}
              </p>
              <p>
                <strong>Продукт:</strong> {selectedEquipment.product}
              </p>
              <p>
                <strong>Тип:</strong> {selectedEquipment.type}
              </p>
              <p>
                <strong>Вес:</strong> {selectedEquipment.weightKg} кг
              </p>
              <p>
                <strong>Количество:</strong> {selectedEquipment.totalCount}
              </p>
            </div>
          </div>

          <p>{selectedEquipment.description}</p>

          {canEdit ? (
            <div className="section-head-row">
              <button
                type="button"
                className="primary-button button-sm"
                onClick={() => setEquipmentDraft(selectedEquipment)}
              >
                Редактировать
              </button>
              <button
                type="button"
                className="danger-button button-sm"
                onClick={() => {
                  void onDeleteEquipment(selectedEquipment.id)
                  setSelectedEquipmentId(null)
                }}
              >
                Удалить
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <div className="cards-column">
          {filteredEquipment.map((item) => (
            <button
              type="button"
              key={item.id}
              className="appeal-card"
              onClick={() => setSelectedEquipmentId(item.id)}
            >
              <div className="card-row">
                <strong>{item.name}</strong>
                <span>{item.product}</span>
              </div>
              <p>Артикул: {item.article}</p>
              <p>
                Тип: {item.type} | Количество: {item.totalCount}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
