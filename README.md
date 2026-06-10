# Finance Bot

Telegram-бот для учёта личных финансов. Данные хранятся в Supabase PostgreSQL.

## Требования

- Node.js v18+
- Аккаунт Supabase (supabase.com)
- Токен бота от @BotFather

## Установка

```
npm install
```

## Настройка

1. Скопируй `.env.example` в `.env` и заполни переменные:

   ```
   BOT_TOKEN=твой_токен
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_KEY=твой_ключ
   ```

2. В Supabase Dashboard -> SQL Editor выполни миграцию из файла `schema.sql`

## Запуск локально

```
node bot.js
```

## Деплой на Railway

1. Запушить на GitHub
2. Подключить репо в railway.com
3. Добавить переменные окружения в Variables (`BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY`)
4. Railway задеплоит автоматически через Dockerfile

## Команды

- `/start`  - начало работы
- `/add`    - добавить транзакцию
- `/list`   - список транзакций
- `/stats`  - статистика
- `/delete` - удалить транзакцию
- `/edit`   - редактировать транзакцию
