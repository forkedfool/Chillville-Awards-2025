# Backend для Chillville Awards 2025 (Supabase)

## Настройка Supabase

### 1. Создайте проект в Supabase

1. Перейдите на https://supabase.com
2. Создайте новый проект
3. Запишите:
   - Project URL (SUPABASE_URL)
   - Anon/Public Key (SUPABASE_ANON_KEY)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY) - **ВАЖНО: храните в секрете!**

### 2. Настройте Discord OAuth в Supabase

1. В панели Supabase перейдите в **Authentication → Providers**
2. Включите **Discord**
3. Добавьте:
   - **Client ID** и **Client Secret** из Discord Developer Portal
   - **Redirect URL**: `https://your-project.supabase.co/auth/v1/callback`
4. В Discord Developer Portal добавьте Redirect URI:
   - `https://your-project.supabase.co/auth/v1/callback`

### 3. Создайте схему базы данных

1. В Supabase перейдите в **SQL Editor**
2. Выполните SQL из файла `supabase-schema.sql`
3. Или создайте таблицы вручную через **Table Editor**

### 4. Настройте переменные окружения

Создайте файл `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_REDIRECT_URL=http://localhost:5173/auth/callback
ADMIN_DISCORD_IDS=your_discord_user_id
```

## Установка и запуск

```bash
cd server
npm install
npm run dev
```

## API Endpoints

### Авторизация
- `GET /api/auth/me` - Информация о текущем пользователе (требует Bearer token)
- `GET /api/auth/discord/url` - Получить URL для авторизации через Discord

### Категории
- `GET /api/categories` - Все категории с номинантами
- `POST /api/categories` - Создать категорию (админ)
- `PUT /api/categories/:id` - Обновить категорию (админ)
- `DELETE /api/categories/:id` - Удалить категорию (админ)

### Номинанты
- `POST /api/categories/:categoryId/nominees` - Создать номинанта (админ)
- `PUT /api/categories/:categoryId/nominees/:nomineeId` - Обновить номинанта (админ)
- `DELETE /api/categories/:categoryId/nominees/:nomineeId` - Удалить номинанта (админ)

### Голосование
- `GET /api/votes/my-votes` - Голоса текущего пользователя
- `POST /api/votes/submit` - Отправить голоса
- `GET /api/votes/stats/:categoryId` - Статистика по категории
- `GET /api/votes/stats` - Полная статистика (админ)

## Интеграция с фронтендом

На фронтенде нужно использовать Supabase клиент для аутентификации:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Авторизация через Discord
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'discord',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});

// Получение токена для API запросов
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```
