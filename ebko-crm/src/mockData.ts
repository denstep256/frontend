import type {
  Appeal,
  ClientCompany,
  CrmBootstrapData,
  Employee,
  EquipmentUnit,
  Site,
  UserProfile,
} from './types'

const employees: Employee[] = [
  {
    id: 'emp-admin-1',
    humanId: 'human-100',
    fullName: 'Егор Власов',
    photoUrl: '',
    age: 38,
    position: 'Администратор CRM',
    phone: '+7 (900) 100-10-10',
    email: 'admin@ebko.local',
    role: 'admin',
    login: 'admin',
    password: 'admin123',
  },
  {
    id: 'emp-ktp-1',
    humanId: 'human-101',
    fullName: 'Илья Новиков',
    photoUrl: '',
    age: 31,
    position: 'Оператор КТП',
    phone: '+7 (900) 101-10-10',
    email: 'ktp@ebko.local',
    role: 'operator_ktp',
    login: 'ktp',
    password: 'ktp123',
  },
  {
    id: 'emp-wfm-1',
    humanId: 'human-102',
    fullName: 'Марк Громов',
    photoUrl: '',
    age: 29,
    position: 'Инженер WFM',
    phone: '+7 (900) 102-10-10',
    email: 'wfm@ebko.local',
    role: 'engineer_wfm',
    login: 'wfm',
    password: 'wfm123',
  },
  {
    id: 'emp-ktp-2',
    humanId: 'human-103',
    fullName: 'Кристина Орлова',
    photoUrl: '',
    age: 27,
    position: 'Оператор КТП',
    phone: '+7 (900) 103-10-10',
    email: 'ktp2@ebko.local',
    role: 'operator_ktp',
    login: 'ktp2',
    password: 'ktp234',
  },
]

const clients: ClientCompany[] = [
  {
    id: 'client-1',
    name: 'ООО Альфа Логистик',
    address: 'г. Москва, ул. Летняя, 16',
    phone: '+7 (495) 101-00-11',
    email: 'ceo@alpha-log.ru',
    siteIds: ['site-1', 'site-2'],
    representatives: [
      {
        id: 'rep-1',
        name: 'Ирина Смирнова',
        phone: '+7 (903) 111-11-11',
        email: 'i.smirnova@alpha-log.ru',
        login: 'client',
        password: 'client123',
        role: 'client',
      },
      {
        id: 'rep-2',
        name: 'Александр Нестеров',
        phone: '+7 (903) 111-11-12',
        email: 'a.nesterov@alpha-log.ru',
        login: 'client2',
        password: 'client234',
        role: 'client',
      },
    ],
  },
  {
    id: 'client-2',
    name: 'АО Север Нет',
    address: 'г. Санкт-Петербург, пр. Речной, 7',
    phone: '+7 (812) 220-13-13',
    email: 'ceo@severnet.ru',
    siteIds: ['site-3'],
    representatives: [
      {
        id: 'rep-3',
        name: 'Дмитрий Поляков',
        phone: '+7 (911) 123-45-67',
        email: 'd.polyakov@severnet.ru',
        login: 'north',
        password: 'north123',
        role: 'client',
      },
    ],
  },
]

const equipment: EquipmentUnit[] = [
  {
    id: 'eq-1',
    article: '10010000000123',
    product: 'MKD',
    name: 'MKD Gateway 24',
    description: 'Шлюз доступа для IP-телефонии с поддержкой SIP',
    totalCount: 14,
  },
  {
    id: 'eq-2',
    article: '20020000000456',
    product: 'Internet',
    name: 'Router B2B Pro',
    description: 'Маршрутизатор для корпоративных клиентов',
    totalCount: 35,
  },
  {
    id: 'eq-3',
    article: '30030000000789',
    product: 'IP-телефония',
    name: 'IP PBX Core License',
    description: 'Лицензия ядра виртуальной АТС',
    totalCount: 55,
  },
]

const sites: Site[] = [
  {
    id: 'site-1',
    address: 'г. Москва, ул. Летняя, 18, офис 11',
    clientId: 'client-1',
    products: ['MKD', 'Internet'],
    facility: [
      { equipmentId: 'eq-1', count: 2 },
      { equipmentId: 'eq-2', count: 4 },
    ],
  },
  {
    id: 'site-2',
    address: 'г. Москва, ул. Ильменская, 4',
    clientId: 'client-1',
    products: ['IP-телефония'],
    facility: [{ equipmentId: 'eq-3', count: 8 }],
  },
  {
    id: 'site-3',
    address: 'г. Санкт-Петербург, ул. Новая, 51',
    clientId: 'client-2',
    products: ['Internet'],
    facility: [{ equipmentId: 'eq-2', count: 6 }],
  },
]

const appeals: Appeal[] = [
  {
    id: 'appeal-1',
    crmNumber: 'CRM-1001',
    type: 'KTP',
    title: 'CRM-1001',
    description:
      'Периодически пропадает доступ к интернету на площадке Москва/Летняя 18. Обрывы длятся 2-3 минуты и влияют на работу call-центра.',
    status: 'Opened',
    priority: 'Critical',
    product: 'Internet',
    clientId: 'client-1',
    representativeId: 'rep-1',
    siteId: 'site-1',
    responsibleId: 'emp-ktp-1',
    createdById: 'client-rep-1',
    createdAt: '2026-02-12T08:10:00.000Z',
    updatedAt: '2026-02-24T10:30:00.000Z',
    deadline: '2026-02-25T08:10:00.000Z',
    linkedAppealIds: ['appeal-3'],
    comments: [
      {
        id: 'comment-1',
        appealId: 'appeal-1',
        authorId: 'client-rep-1',
        authorName: 'Ирина Смирнова',
        text: 'Подтверждаю проблему, вчера падение было три раза.',
        createdAt: '2026-02-23T09:12:00.000Z',
        files: [],
      },
      {
        id: 'comment-2',
        appealId: 'appeal-1',
        authorId: 'emp-ktp-1',
        authorName: 'Илья Новиков',
        text: 'Запросили логи с маршрутизатора, прикрепил шаблон отчета.',
        createdAt: '2026-02-24T10:30:00.000Z',
        files: [{ id: 'f-1', name: 'report-template.md', size: 2214 }],
      },
    ],
  },
  {
    id: 'appeal-2',
    crmNumber: 'CRM-1002',
    type: 'KTP',
    title: 'CRM-1002',
    description:
      'Проблема с исходящими звонками через IP-телефонию. На части номеров фиксируется код 503.',
    status: 'Opened',
    priority: 'Important',
    product: 'IP-телефония',
    clientId: 'client-2',
    representativeId: 'rep-3',
    siteId: 'site-3',
    responsibleId: 'emp-ktp-2',
    createdById: 'client-rep-3',
    createdAt: '2026-02-18T12:00:00.000Z',
    updatedAt: '2026-02-24T09:10:00.000Z',
    deadline: '2026-03-05T12:00:00.000Z',
    linkedAppealIds: [],
    comments: [],
  },
  {
    id: 'appeal-3',
    crmNumber: 'Наряд-2001',
    type: 'WFM',
    title: 'Наряд-2001',
    description:
      'Выезд инженера на площадку Москва/Летняя 18 для проверки патч-панели и диагностики оптического модуля.',
    status: 'Opened',
    priority: 'Important',
    product: 'Internet',
    clientId: 'client-1',
    representativeId: 'rep-1',
    siteId: 'site-1',
    responsibleId: 'emp-wfm-1',
    createdById: 'emp-ktp-1',
    createdAt: '2026-02-20T14:05:00.000Z',
    updatedAt: '2026-02-24T07:35:00.000Z',
    deadline: '2026-03-06T14:05:00.000Z',
    linkedAppealIds: ['appeal-1'],
    comments: [
      {
        id: 'comment-3',
        appealId: 'appeal-3',
        authorId: 'emp-wfm-1',
        authorName: 'Марк Громов',
        text: 'Инженер на площадке с 11:00, ожидаем доступ в серверную.',
        createdAt: '2026-02-24T07:35:00.000Z',
        files: [],
      },
    ],
  },
  {
    id: 'appeal-4',
    crmNumber: 'CRM-1003',
    type: 'KTP',
    title: 'CRM-1003',
    description:
      'Нужна консультация по добавлению новых внутренних номеров и перенастройке маршрутизации звонков.',
    status: 'Customer Pending',
    priority: 'Basic',
    product: 'IP-телефония',
    clientId: 'client-1',
    representativeId: 'rep-2',
    siteId: 'site-2',
    responsibleId: 'emp-ktp-1',
    createdById: 'client-rep-2',
    createdAt: '2026-02-22T11:15:00.000Z',
    updatedAt: '2026-02-24T06:45:00.000Z',
    deadline: '2026-03-24T11:15:00.000Z',
    linkedAppealIds: [],
    comments: [],
  },
  {
    id: 'appeal-5',
    crmNumber: 'Наряд-2002',
    type: 'WFM',
    title: 'Наряд-2002',
    description:
      'Плановая замена старого маршрутизатора на Router B2B Pro в Санкт-Петербурге.',
    status: 'Customer Pending',
    priority: 'Basic',
    product: 'Internet',
    clientId: 'client-2',
    representativeId: 'rep-3',
    siteId: 'site-3',
    responsibleId: 'emp-wfm-1',
    createdById: 'emp-wfm-1',
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-02-23T16:20:00.000Z',
    deadline: '2026-03-12T08:00:00.000Z',
    linkedAppealIds: [],
    comments: [],
  },
]

const users: UserProfile[] = [
  {
    id: 'emp-admin-1',
    fullName: 'Егор Власов',
    role: 'admin',
    position: 'Администратор CRM',
    phone: '+7 (900) 100-10-10',
    email: 'admin@ebko.local',
    photoUrl: '',
    login: 'admin',
  },
  {
    id: 'emp-ktp-1',
    fullName: 'Илья Новиков',
    role: 'operator_ktp',
    position: 'Оператор КТП',
    phone: '+7 (900) 101-10-10',
    email: 'ktp@ebko.local',
    photoUrl: '',
    login: 'ktp',
  },
  {
    id: 'emp-wfm-1',
    fullName: 'Марк Громов',
    role: 'engineer_wfm',
    position: 'Инженер WFM',
    phone: '+7 (900) 102-10-10',
    email: 'wfm@ebko.local',
    photoUrl: '',
    login: 'wfm',
  },
  {
    id: 'client-rep-1',
    fullName: 'Ирина Смирнова',
    role: 'client',
    position: 'Представитель клиента',
    phone: '+7 (903) 111-11-11',
    email: 'i.smirnova@alpha-log.ru',
    photoUrl: '',
    login: 'client',
    clientId: 'client-1',
    representativeId: 'rep-1',
  },
  {
    id: 'client-rep-3',
    fullName: 'Дмитрий Поляков',
    role: 'client',
    position: 'Представитель клиента',
    phone: '+7 (911) 123-45-67',
    email: 'd.polyakov@severnet.ru',
    photoUrl: '',
    login: 'north',
    clientId: 'client-2',
    representativeId: 'rep-3',
  },
]

const mockCredentialMap: Record<string, { password: string; userId: string }> = {
  admin: { password: 'admin123', userId: 'emp-admin-1' },
  ktp: { password: 'ktp123', userId: 'emp-ktp-1' },
  wfm: { password: 'wfm123', userId: 'emp-wfm-1' },
  client: { password: 'client123', userId: 'client-rep-1' },
  north: { password: 'north123', userId: 'client-rep-3' },
}

const dataset: CrmBootstrapData = {
  appeals,
  employees,
  clients,
  sites,
  equipment,
  users,
}

export function getMockBootstrapData(): CrmBootstrapData {
  return JSON.parse(JSON.stringify(dataset)) as CrmBootstrapData
}

export function findMockUserByCredentials(login: string, password: string): UserProfile | null {
  const credentials = mockCredentialMap[login]
  if (!credentials || credentials.password !== password) {
    return null
  }

  const user = users.find((item) => item.id === credentials.userId)
  if (!user) {
    return null
  }

  return JSON.parse(JSON.stringify(user)) as UserProfile
}


