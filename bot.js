// bot.js - точка входа, инициализация и запуск бота
require('dotenv').config()
const { Telegraf, session } = require('telegraf')
const handlers = require('./handlers')

// проверяем наличие токена
if (!process.env.BOT_TOKEN) {
  throw new Error('Не задан BOT_TOKEN в .env')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

// session нужен для работы сцен (WizardScene хранит состояние в сессии)
bot.use(session())
bot.use(handlers.buildStage().middleware())

// регистрируем команды
handlers.registerCommands(bot)

// глобальный перехват ошибок, чтобы бот не падал
bot.catch((err, ctx) => {
  console.error('Ошибка при обработке обновления:', err)
  try {
    ctx.reply('Произошла ошибка. Попробуйте ещё раз.')
  } catch (_) {
    // если даже ответить не получилось - просто логируем
  }
})

// запуск в режиме polling
bot.launch().catch((e) => {
  console.error('Не удалось запустить бот:', e)
  process.exit(1)
})
console.log('Бот запущен (polling)')

// корректная остановка по сигналам
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
