# Chillville Awards 2025

Веб-приложение для голосования на награды сервера Chillville с бекендом на Supabase.

## 🚀 Быстрый старт

### 1. Настройка Supabase

1. Создайте проект на https://supabase.com
2. Получите ключи:
   - Project URL
   - Anon/Public Key
   - Service Role Key (храните в секрете!)

### 2. Настройка Discord OAuth в Supabase

1. В Supabase: **Authentication → Providers → Discord**
2. Включите Discord и добавьте Client ID/Secret из Discord Developer Portal
3. Redirect URL в Discord: `https://your-project.supabase.co/auth/v1/callback`

### 3. Создание базы данных

В Supabase SQL Editor выполните SQL из `server/supabase-schema.sql`

### 4. Установка зависимостей

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
```

### 5. Настройка переменных окружения

**Frontend** - создайте `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000/api
```

**Backend** - создайте `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_REDIRECT_URL=http://localhost:5173/auth/callback
ADMIN_DISCORD_IDS=your_discord_user_id
```

### 6. Запуск

**Терминал 1 - Backend:**
```bash
cd server
npm run dev
```

**Терминал 2 - Frontend:**
```bash
npm run dev
```

## 📁 Структура проекта

```
├── src/              # Frontend (React + Vite)
│   ├── App.jsx       # Главный компонент
│   ├── api.js        # API клиент
│   ├── supabase.js   # Supabase клиент
│   └── ...
├── server/           # Backend (Express + Supabase)
│   ├── server.js     # Express сервер
│   ├── supabase.js   # Supabase клиент (admin)
│   ├── database.js   # Функции работы с БД
│   ├── routes/       # API маршруты
│   └── supabase-schema.sql  # SQL схема
└── README.md
```

## 🔑 Особенности

- ✅ **Supabase Auth** - встроенная аутентификация через Discord
- ✅ **PostgreSQL** - надежная база данных
- ✅ **Row Level Security** - безопасность на уровне БД
- ✅ **REST API** - простой Express API для бизнес-логики
- ✅ **Realtime** - возможность добавить обновления в реальном времени

## 📚 Документация

Подробная документация в `server/README.md`
