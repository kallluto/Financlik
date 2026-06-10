// db.js - инициализация клиента Supabase
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// проверяем, что переменные окружения заданы
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Не заданы SUPABASE_URL и/или SUPABASE_KEY в .env')
}

// создаём единый клиент Supabase для всего приложения
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

module.exports = supabase
