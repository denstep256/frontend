import type { AppealPriority, AppealStatus, ModuleKey, UserRole } from './types'

export const MODULES: Array<{ key: ModuleKey; label: string }> = [
  { key: 'appeals', label: 'Обращения' },
  { key: 'employees', label: 'Сотрудники' },
  { key: 'clients', label: 'Клиенты' },
  { key: 'sites', label: 'Площадки и оборудование' },
  { key: 'task_board', label: 'Доска задач' },
  { key: 'profile', label: 'Настройки профиля' },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Админ',
  operator_ktp: 'Оператор КТП',
  engineer_wfm: 'Инженер WFM',
  client: 'Клиент',
}

export const STATUS_ORDER: AppealStatus[] = [
  'Created',
  'Opened',
  'Customer Pending',
  'Done',
  'Verified',
]

export const PRIORITY_ORDER: AppealPriority[] = ['Critical', 'Important', 'Basic']

export const PRIORITY_DEADLINE_DAYS: Record<AppealPriority, number> = {
  Basic: 30,
  Important: 15,
  Critical: 1,
}

export const STATUS_LABELS: Record<AppealStatus, string> = {
  Created: 'Создано',
  Opened: 'В работе',
  'Customer Pending': 'Ожидание клиента',
  Done: 'Выполнено',
  Verified: 'Проверено',
}
