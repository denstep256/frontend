Базовый префикс API: `/api/v1`.

## 1. Ключевые требования контракта

1. Основной формат полей: `camelCase` в JSON.
2. Для совместимости можно принимать `snake_case`, но ответы для `bootstrap` должны быть в `camelCase`.
3. Все `id` отдавать строками (даже если в БД `bigint`) для безопасной работы в JS.
4. `siteId` у оборудования должен быть nullable (`null`/отсутствует), так как в UI есть отвязанное оборудование.
5. Даты: ISO-8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
6. Ошибки в едином формате:

```json
{
  "errorCode": "validation_error",
  "message": "Человекочитаемое сообщение",
  "details": {}
}
```

## 2. Сущности

### UserProfile
```json
{
  "id": "string",
  "fullName": "string",
  "role": "admin | operator_ktp | engineer_wfm | client",
  "position": "string",
  "phoneNumber": "string",
  "email": "string",
  "image": "string",
  "login": "string",
  "clientId": "string?",
  "representativeId": "string?"
}
```

### Employee
```json
{
  "accountId": "string",
  "fullName": "string",
  "image": "string",
  "birthDate": "YYYY-MM-DD",
  "position": "string",
  "phoneNumber": "string",
  "email": "string",
  "role": "admin | operator_ktp | engineer_wfm",
  "login": "string",
  "passwordHash": "string",
  "hireDate": "YYYY-MM-DD"
}
```

### ClientCompany + Representative
```json
{
  "id": "string",
  "name": "string",
  "address": "string",
  "ceoId": "string?",
  "representatives": [
    {
      "accountId": "string",
      "clientId": "string",
      "fullName": "string",
      "phoneNumber": "string",
      "email": "string",
      "login": "string",
      "passwordHash": "string",
      "role": "client"
    }
  ]
}
```

### Site
```json
{
  "id": "string",
  "name": "string",
  "address": "string",
  "responsibleId": "string",
  "clientId": "string",
  "productIds": ["string"]
}
```

### EquipmentUnit
```json
{
  "id": "string",
  "typeId": "string",
  "siteId": "string?",
  "serialNumber": "string",
  "name": "string",
  "weight": 0,
  "description": "string"
}
```

### AppealComment
```json
{
  "id": "string",
  "ticketId": "string",
  "isClosedComment": false,
  "createdBy": "string",
  "authorName": "string",
  "contents": "string",
  "createdAt": "2026-02-24T10:30:00.000Z",
  "updatedAt": "2026-02-24T10:30:00.000Z",
  "files": [
    { "id": "string", "name": "string", "size": 2214 }
  ]
}
```

### Appeal
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "typeId": "KTP | WFM",
  "statusId": "Created | Opened | Customer Pending | Done | Verified",
  "criticalityId": "Basic | Important | Critical",
  "productId": "string?",
  "clientId": "string",
  "siteId": "string?",
  "responsibleId": "string?",
  "createdBy": "string",
  "updatedBy": "string",
  "createdAt": "2026-02-24T10:30:00.000Z",
  "updatedAt": "2026-02-24T10:30:00.000Z",
  "linkedTicketIds": ["string"],
  "comments": []
}
```

## 3. Обязательные endpoint'ы

## 3.1 Auth

### `POST /auth/login`
- Вход через `Authorization: Basic base64(login:password)`.
- Body не обязателен.

Ответ `200`:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": { "...UserProfile" }
}
```

Примечание: фронтенд также принимает `accessToken`/`refreshToken`, но канонично `snake_case`.

### `POST /auth/refresh`
Body:
```json
{ "refresh_token": "string" }
```

Ответ `200`:
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

### `POST /auth/logout`
- Header: `Authorization: Bearer <accessToken>`
- Ответ: `204`.

### `GET /auth/me`
- Профиль текущего пользователя.
- Ответ `200`: `UserProfile`.

## 3.2 Bootstrap

### `GET /bootstrap`
- Header: `Authorization: Bearer <accessToken>`
- Единая начальная загрузка данных CRM.

Ответ `200` строго с ключами:
```json
{
  "appeals": [],
  "employees": [],
  "clients": [],
  "sites": [],
  "equipment": [],
  "users": [],
  "products": [],
  "equipmentTypes": [],
  "ticketTypes": [],
  "ticketStatuses": [],
  "ticketCriticalities": []
}
```

Важно: именно `equipmentTypes`, `ticketTypes`, `ticketStatuses`, `ticketCriticalities` (не `snake_case`), иначе фронтенд не подхватит справочники.

## 3.3 Appeals

### `POST /appeals`
- Создание обращения.
- Минимально необходимые поля:

```json
{
  "title": "CRM-1004",
  "description": "string",
  "typeId": "KTP",
  "statusId": "Created",
  "criticalityId": "Basic",
  "clientId": "client-1",
  "siteId": "site-1",
  "productId": "product-2",
  "createdBy": "acc-rep-1",
  "updatedBy": "acc-rep-1"
}
```

Ответ `201`: созданный `Appeal`.

### `PATCH /appeals/{appealId}`
- Частичное обновление обращения (статус, критичность, ответственный, метки времени и т.д.).
- Ответ `200`: обновленный `Appeal`.

### `POST /appeals/{appealId}/comments`
Body:
```json
{
  "contents": "string",
  "files": [{ "name": "report.md", "size": 2214 }]
}
```

Ответ `201`: созданный `AppealComment`.

### `POST /appeals/{appealId}/links`
Body:
```json
{ "linked_appeal_id": "appeal-3" }
```

Ответ `201`:
```json
{ "appealId": "appeal-1", "linkedAppealId": "appeal-3" }
```

## 4. Endpoint'ы для полного покрытия всех модулей UI

## 4.1 Справочники

### `GET /products`
### `GET /equipment-types`
### `GET /ticket-types`
### `GET /ticket-statuses`
### `GET /ticket-criticalities`

Ответы: массивы соответствующих сущностей из раздела 2.

## 4.2 Сотрудники

### `GET /employees`
- Query: `search?`, `role?`, `page?`, `pageSize?`

### `POST /employees`

### `GET /employees/{accountId}`

### `PATCH /employees/{accountId}`

### `DELETE /employees/{accountId}`

Контракт сущности: `Employee`.

## 4.3 Профиль

### `PATCH /profiles/me`
Body:
```json
{
  "image": "string?",
  "position": "string?",
  "phoneNumber": "string?",
  "email": "string?"
}
```

Ответ `200`: обновленный `UserProfile`.

## 4.4 Заказчики и представители

### `GET /clients`
- Query: `search?`, `page?`, `pageSize?`

### `POST /clients`

### `GET /clients/{clientId}`

### `PATCH /clients/{clientId}`

### `DELETE /clients/{clientId}`

### `POST /clients/{clientId}/representatives`

### `PATCH /representatives/{accountId}`

### `DELETE /representatives/{accountId}`

Контракт сущностей: `ClientCompany`, `ClientRepresentative`.

## 4.5 Площадки

### `GET /sites`
- Query: `clientId?`, `responsibleId?`, `search?`, `page?`, `pageSize?`

### `POST /sites`

### `GET /sites/{siteId}`

### `PATCH /sites/{siteId}`

### `DELETE /sites/{siteId}`

Контракт сущности: `Site`.

## 4.6 Оборудование

### `GET /equipment`
- Query: `siteId?`, `typeId?`, `search?`, `unassigned?`, `page?`, `pageSize?`

### `POST /equipment`

### `GET /equipment/{equipmentId}`

### `PATCH /equipment/{equipmentId}`

### `PATCH /equipment/{equipmentId}/site`
Body:
```json
{ "siteId": "site-1" }
```
или
```json
{ "siteId": null }
```

### `DELETE /equipment/{equipmentId}`

Контракт сущности: `EquipmentUnit`.

## 4.7 Обращения и комментарии (расширенный набор)

### `GET /appeals`
- Query: `statusId?`, `criticalityId?`, `typeId?`, `clientId?`, `siteId?`, `responsibleId?`, `search?`, `createdFrom?`, `createdTo?`, `page?`, `pageSize?`

### `GET /appeals/{appealId}`

### `GET /appeals/{appealId}/comments`

### `PATCH /appeals/{appealId}/comments/{commentId}`

### `DELETE /appeals/{appealId}/comments/{commentId}`

### `DELETE /appeals/{appealId}/links/{linkedAppealId}`

## 4.8 Дашборды доски задач


## 5. Ролевые ограничения

1. `client` видит только данные своей компании (`clientId`).
2. `client` может переводить статус только `Done -> Verified`.
3. `operator_ktp` и `engineer_wfm` не должны переводить статус в `Created` и `Verified` напрямую.
4. `engineer_wfm` редактирует только обращения типа `WFM`.
5. Управление сотрудниками/заказчиками/представителями/площадками: только `admin`.
6. Редактирование оборудования: `admin` и `engineer_wfm`.