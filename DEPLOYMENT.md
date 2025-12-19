# Гайд по деплою Chillville Awards на сервер

## 📋 Требования

- Сервер с Ubuntu 20.04+ или Debian 11+
- Доступ по SSH
- Домен (опционально, но рекомендуется)
- Аккаунт Supabase

---

## 1. Подготовка сервера

### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### Установка Node.js (через NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Проверка версии (должна быть 20.x)
```

### Установка дополнительных инструментов
```bash
sudo apt install -y git nginx certbot python3-certbot-nginx
```

### Установка PM2 (менеджер процессов)
```bash
sudo npm install -g pm2
```

---

## 2. Клонирование проекта

```bash
cd /var/www
sudo git clone <ваш-репозиторий> chillville-awards
sudo chown -R $USER:$USER chillville-awards
cd chillville-awards
```

---

## 3. Настройка бэкенда

### Установка зависимостей
```bash
cd server
npm install
```

### Создание файла `.env`
```bash
nano .env
```

Содержимое `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3000
FRONTEND_URL=https://yourdomain.com
SUPABASE_REDIRECT_URL=https://yourdomain.com/auth/callback
ADMIN_DISCORD_IDS=your_discord_user_id_1,your_discord_user_id_2
```

**Где взять ключи:**
- Зайдите в Supabase Dashboard → Settings → API
- `SUPABASE_URL` — Project URL
- `SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (секретный!)

**Как узнать Discord User ID:**
1. Включите Developer Mode в Discord (Settings → Advanced → Developer Mode)
2. Правый клик по вашему профилю → Copy ID

### Инициализация базы данных

Выполните SQL из `server/supabase-schema.sql` в Supabase SQL Editor.

---

## 4. Настройка фронтенда

### Установка зависимостей
```bash
cd ..  # Вернуться в корень проекта
npm install
```

### Создание файла `.env`
```bash
nano .env
```

Содержимое `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://yourdomain.com/api
```

### Сборка фронтенда
```bash
npm run build
```

Результат будет в папке `dist/`.

---

## 5. Настройка Supabase

### Discord OAuth в Supabase

1. Зайдите в Supabase Dashboard → Authentication → Providers → Discord
2. Включите Discord
3. Добавьте:
   - **Client ID** из Discord Developer Portal
   - **Client Secret** из Discord Developer Portal
4. В Discord Developer Portal добавьте Redirect URI:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

---

## 6. Настройка Nginx

### Создание конфигурации
```bash
sudo nano /etc/nginx/sites-available/chillville-awards
```

Содержимое:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (статичные файлы)
    location / {
        root /var/www/chillville-awards/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### Активация конфигурации
```bash
sudo ln -s /etc/nginx/sites-available/chillville-awards /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl reload nginx
```

---

## 7. Настройка SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Следуйте инструкциям. Certbot автоматически обновит конфигурацию Nginx.

---

## 8. Запуск бэкенда через PM2

### Создание конфигурации PM2
```bash
cd /var/www/chillville-awards/server
# Файл ecosystem.config.cjs уже есть в проекте, можно использовать его
# Или создать свой, если нужны другие настройки
```

### Запуск
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Настройка автозапуска при перезагрузке сервера
```

### Полезные команды PM2
```bash
pm2 status          # Статус процессов
pm2 logs            # Логи
pm2 restart all     # Перезапуск
pm2 stop all        # Остановка
pm2 delete all      # Удаление
```

---

## 9. Обновление сайта

### Скрипт для обновления
```bash
nano /var/www/chillville-awards/update.sh
```

Содержимое:
```bash
#!/bin/bash
cd /var/www/chillville-awards

# Обновление кода
git pull origin main

# Обновление зависимостей
npm install
cd server && npm install && cd ..

# Пересборка фронтенда
npm run build

# Перезапуск бэкенда
cd server
pm2 restart chillville-awards-backend

echo "Обновление завершено!"
```

Сделать исполняемым:
```bash
chmod +x update.sh
```

Использование:
```bash
./update.sh
```

---

## 10. Проверка работы

1. **Фронтенд**: Откройте `https://yourdomain.com`
2. **Бэкенд**: Проверьте `https://yourdomain.com/api/categories`
3. **Логи**: `pm2 logs chillville-awards-backend`

---

## 11. Мониторинг и логи

### Логи Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Логи PM2
```bash
pm2 logs chillville-awards-backend
```

### Мониторинг ресурсов
```bash
pm2 monit
```

---

## 12. Безопасность

### Firewall (UFW)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 13. Резервное копирование

### Резервная копия базы данных
Supabase автоматически делает бэкапы, но можно экспортировать данные через Supabase Dashboard → Database → Backups.

### Резервная копия кода
```bash
tar -czf chillville-backup-$(date +%Y%m%d).tar.gz /var/www/chillville-awards
```

---

## 🔧 Решение проблем

### Бэкенд не запускается
```bash
cd /var/www/chillville-awards/server
pm2 logs chillville-awards-backend
# Проверьте .env файл и переменные окружения
```

### Nginx ошибки
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Проблемы с SSL
```bash
sudo certbot renew --dry-run
```

### Порт 3000 занят
```bash
sudo lsof -i :3000
# Или измените PORT в .env
```

---

## 📝 Чеклист деплоя

- [ ] Node.js установлен
- [ ] Проект склонирован
- [ ] Зависимости установлены (frontend + backend)
- [ ] `.env` файлы созданы и заполнены
- [ ] База данных инициализирована в Supabase
- [ ] Discord OAuth настроен в Supabase
- [ ] Фронтенд собран (`npm run build`)
- [ ] Nginx настроен
- [ ] SSL сертификат установлен
- [ ] Бэкенд запущен через PM2
- [ ] Автозапуск PM2 настроен
- [ ] Firewall настроен
- [ ] Сайт доступен по HTTPS

---

## 🚀 Быстрый старт (TL;DR)

```bash
# 1. Установка
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# 2. Клонирование
cd /var/www
sudo git clone <repo> chillville-awards
sudo chown -R $USER:$USER chillville-awards
cd chillville-awards

# 3. Бэкенд
cd server
npm install
# Создайте .env файл
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 4. Фронтенд
cd ..
npm install
# Создайте .env файл
npm run build

# 5. Nginx
sudo nano /etc/nginx/sites-available/chillville-awards
# Вставьте конфигурацию выше
sudo ln -s /etc/nginx/sites-available/chillville-awards /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. SSL
sudo certbot --nginx -d yourdomain.com
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `pm2 logs` и `sudo tail -f /var/log/nginx/error.log`
2. Убедитесь, что все переменные окружения заполнены
3. Проверьте, что Supabase настроен правильно
4. Убедитесь, что порты открыты в firewall

