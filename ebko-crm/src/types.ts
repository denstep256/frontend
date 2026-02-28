export type UserRole = 'admin' | 'operator_ktp' | 'engineer_wfm' | 'client'

export type ModuleKey = 'appeals' | 'employees' | 'clients' | 'sites' | 'task_board' | 'profile'

export type AppealType = 'KTP' | 'WFM'

export type AppealStatus =
  | 'Created'
  | 'Opened'
  | 'Customer Pending'
  | 'Done'
  | 'Verified'

export type AppealPriority = 'Basic' | 'Important' | 'Critical'

export type Product = 'MKD' | 'Internet' | 'IP-телефония'

export type EquipmentType =
  | 'Абонентское'
  | 'Пассивные сетевые установки'
  | 'Системы коммутации'
  | 'ПО'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: string
  fullName: string
  role: UserRole
  position: string
  phone: string
  email: string
  photoUrl: string
  login: string
  clientId?: string
  representativeId?: string
}

export interface FileAttachment {
  id: string
  name: string
  size: number
}

export interface AppealComment {
  id: string
  appealId: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
  files: FileAttachment[]
}

export interface Appeal {
  id: string
  crmNumber: string
  type: AppealType
  title: string
  description: string
  status: AppealStatus
  priority: AppealPriority
  product: Product
  clientId: string
  representativeId?: string
  siteId?: string
  responsibleId?: string
  createdById: string
  createdAt: string
  updatedAt: string
  deadline: string
  linkedAppealIds: string[]
  comments: AppealComment[]
}

export interface Employee {
  id: string
  humanId: string
  fullName: string
  photoUrl: string
  age: number
  position: string
  phone: string
  email: string
  role: UserRole
  login: string
  password: string
}

export interface ClientRepresentative {
  id: string
  name: string
  phone: string
  email: string
  login: string
  password: string
  role: 'client'
}

export interface ClientCompany {
  id: string
  name: string
  address: string
  phone: string
  email: string
  representatives: ClientRepresentative[]
  siteIds: string[]
}

export interface EquipmentUnit {
  id: string
  article: string
  product: Product
  type: EquipmentType
  weightKg: number
  name: string
  description: string
  totalCount: number
}

export interface SiteEquipment {
  equipmentId: string
  count: number
}

export interface Site {
  id: string
  address: string
  clientId: string
  products: Product[]
  facility: SiteEquipment[]
}

export interface CrmBootstrapData {
  appeals: Appeal[]
  employees: Employee[]
  clients: ClientCompany[]
  sites: Site[]
  equipment: EquipmentUnit[]
  users: UserProfile[]
}

export interface LoginPayload {
  login: string
  password: string
}

export interface LoginResult {
  tokens: AuthTokens
  user: UserProfile
}

export interface RefreshPayload {
  refreshToken: string
}
