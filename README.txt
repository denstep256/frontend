# CRM Frontend

Фронтенд-часть CRM-системы на React + TypeScript + Vite.

## Требования

- Node.js 20+
- npm 10+

Проверить версии:

```bash
node -v
npm -v
```

## Установка зависимостей

В проекте есть основное приложение в папке `ebko-crm`.

1. Установите зависимости корневого проекта (если используются локальные скрипты/инструменты):

```bash
npm install
```

2. Установите зависимости фронтенд-приложения:

```bash
cd ebko-crm
npm install
```

## Запуск проекта (режим разработки)

Из папки `ebko-crm`:

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

После запуска Vite выведет локальный адрес (обычно `http://localhost:5173`).

## Сборка проекта

Из папки `ebko-crm`:

```bash
npm run build
```

## Предпросмотр production-сборки

Из папки `ebko-crm`:

```bash
npm run preview
```

## Проверка линтером

Из папки `ebko-crm`:

```bash
npm run lint
```
