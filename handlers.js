// handlers.js - обработчики команд и сцен (WizardScene)
const { Scenes, Markup } = require('telegraf')
const tx = require('./transactions')

// ---------- Сцена /add - пошаговое добавление транзакции ----------
const addWizard = new Scenes.WizardScene(
  'add-wizard',
  // шаг 1 - выбор типа операции
  async (ctx) => {
    await ctx.reply(
      'Выберите тип операции:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💰 Доход', 'type:income')],
        [Markup.button.callback('💸 Расход', 'type:expense')],
      ])
    )
    return ctx.wizard.next()
  },
  // шаг 2 - выбор категории (зависит от типа)
  async (ctx) => {
    if (!ctx.callbackQuery || !ctx.callbackQuery.data.startsWith('type:')) {
      return ctx.reply('Пожалуйста, выберите тип кнопкой.')
    }
    await ctx.answerCbQuery()
    const type = ctx.callbackQuery.data.split(':')[1]
    ctx.wizard.state.type = type
    const cats = tx.CATEGORIES[type]
    await ctx.reply(
      'Выберите категорию:',
      Markup.inlineKeyboard(cats.map((c) => [Markup.button.callback(c, `cat:${c}`)]))
    )
    return ctx.wizard.next()
  },
  // шаг 3 - ввод суммы
  async (ctx) => {
    if (!ctx.callbackQuery || !ctx.callbackQuery.data.startsWith('cat:')) {
      return ctx.reply('Пожалуйста, выберите категорию кнопкой.')
    }
    await ctx.answerCbQuery()
    // 'cat:' занимает 4 символа - остальное название категории
    ctx.wizard.state.category = ctx.callbackQuery.data.slice(4)
    await ctx.reply('Введите сумму (число больше 0):')
    return ctx.wizard.next()
  },
  // шаг 4 - ввод комментария (с кнопкой «Пропустить»)
  async (ctx) => {
    const text = ctx.message && ctx.message.text
    // запятую тоже принимаем как разделитель дробной части
    const amount = Number((text || '').replace(',', '.'))
    if (!text || isNaN(amount) || amount <= 0) {
      return ctx.reply('Сумма должна быть числом больше 0. Введите ещё раз:')
    }
    ctx.wizard.state.amount = amount
    await ctx.reply(
      'Добавьте комментарий или нажмите «Пропустить»:',
      Markup.inlineKeyboard([[Markup.button.callback('Пропустить', 'skip')]])
    )
    return ctx.wizard.next()
  },
  // шаг 5 - сохранение в Supabase и подтверждение
  async (ctx) => {
    let comment = ''
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'skip') {
      await ctx.answerCbQuery()
      comment = ''
    } else if (ctx.message && ctx.message.text) {
      comment = ctx.message.text
    } else {
      return ctx.reply('Введите комментарий текстом или нажмите «Пропустить».')
    }
    try {
      const { type, category, amount } = ctx.wizard.state
      const saved = await tx.addTransaction(ctx.from.id, type, category, amount, comment)
      await ctx.reply('✅ Транзакция добавлена:\n' + tx.formatLine(saved))
    } catch (e) {
      await ctx.reply('Ошибка при сохранении: ' + e.message)
    }
    return ctx.scene.leave()
  }
)

// ---------- Сцена /delete - удаление транзакции с подтверждением ----------
const deleteWizard = new Scenes.WizardScene(
  'delete-wizard',
  // шаг 1 - запрос id
  async (ctx) => {
    await ctx.reply('Введите id транзакции для удаления:')
    return ctx.wizard.next()
  },
  // шаг 2 - показать детали и кнопки подтверждения
  async (ctx) => {
    const id = Number(ctx.message && ctx.message.text)
    if (!Number.isInteger(id) || id <= 0) {
      return ctx.reply('id должен быть целым числом. Введите ещё раз:')
    }
    try {
      const rows = await tx.listTransactions(ctx.from.id)
      const found = rows.find((t) => t.id === id)
      if (!found) {
        await ctx.reply('Транзакция с таким id не найдена.')
        return ctx.scene.leave()
      }
      ctx.wizard.state.id = id
      await ctx.reply(
        tx.formatLine(found) + '\n\nУдалить эту транзакцию?',
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, удалить', 'del:yes')],
          [Markup.button.callback('❌ Отмена', 'del:no')],
        ])
      )
      return ctx.wizard.next()
    } catch (e) {
      await ctx.reply('Ошибка: ' + e.message)
      return ctx.scene.leave()
    }
  },
  // шаг 3 - обработка подтверждения
  async (ctx) => {
    if (!ctx.callbackQuery) {
      return ctx.reply('Подтвердите действие кнопкой.')
    }
    await ctx.answerCbQuery()
    if (ctx.callbackQuery.data === 'del:yes') {
      try {
        await tx.deleteTransaction(ctx.from.id, ctx.wizard.state.id)
        await ctx.reply('🗑 Транзакция удалена.')
      } catch (e) {
        await ctx.reply('Ошибка при удалении: ' + e.message)
      }
    } else {
      await ctx.reply('Удаление отменено.')
    }
    return ctx.scene.leave()
  }
)

// ---------- Сцена /edit - редактирование транзакции ----------
const editWizard = new Scenes.WizardScene(
  'edit-wizard',
  // шаг 1 - запрос id
  async (ctx) => {
    await ctx.reply('Введите id транзакции для редактирования:')
    return ctx.wizard.next()
  },
  // шаг 2 - показать текущие данные и кнопки выбора поля
  async (ctx) => {
    const id = Number(ctx.message && ctx.message.text)
    if (!Number.isInteger(id) || id <= 0) {
      return ctx.reply('id должен быть целым числом. Введите ещё раз:')
    }
    try {
      const rows = await tx.listTransactions(ctx.from.id)
      const found = rows.find((t) => t.id === id)
      if (!found) {
        await ctx.reply('Транзакция с таким id не найдена.')
        return ctx.scene.leave()
      }
      ctx.wizard.state.id = id
      await ctx.reply(
        tx.formatLine(found) + '\n\nВыберите поле для изменения:',
        Markup.inlineKeyboard([
          [Markup.button.callback('Тип', 'field:type')],
          [Markup.button.callback('Категория', 'field:category')],
          [Markup.button.callback('Сумма', 'field:amount')],
          [Markup.button.callback('Комментарий', 'field:comment')],
        ])
      )
      return ctx.wizard.next()
    } catch (e) {
      await ctx.reply('Ошибка: ' + e.message)
      return ctx.scene.leave()
    }
  },
  // шаг 3 - запрос нового значения для выбранного поля
  async (ctx) => {
    if (!ctx.callbackQuery || !ctx.callbackQuery.data.startsWith('field:')) {
      return ctx.reply('Выберите поле кнопкой.')
    }
    await ctx.answerCbQuery()
    const field = ctx.callbackQuery.data.split(':')[1]
    ctx.wizard.state.field = field
    // подсказки для ввода нового значения по каждому полю
    const prompts = {
      type: 'Введите новый тип: income или expense',
      category: 'Введите новую категорию:',
      amount: 'Введите новую сумму (число больше 0):',
      comment: 'Введите новый комментарий:',
    }
    await ctx.reply(prompts[field])
    return ctx.wizard.next()
  },
  // шаг 4 - валидация, UPDATE в Supabase и подтверждение
  async (ctx) => {
    const text = ctx.message && ctx.message.text
    if (!text) {
      return ctx.reply('Введите новое значение текстом.')
    }
    const field = ctx.wizard.state.field
    const fields = {}
    if (field === 'type') {
      if (text !== 'income' && text !== 'expense') {
        return ctx.reply('Тип должен быть income или expense. Введите ещё раз:')
      }
      fields.type = text
    } else if (field === 'amount') {
      const amount = Number(text.replace(',', '.'))
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('Сумма должна быть числом больше 0. Введите ещё раз:')
      }
      fields.amount = amount
    } else if (field === 'category') {
      fields.category = text
    } else {
      fields.comment = text
    }
    try {
      const updated = await tx.editTransaction(ctx.from.id, ctx.wizard.state.id, fields)
      await ctx.reply('✏️ Транзакция обновлена:\n' + tx.formatLine(updated))
    } catch (e) {
      await ctx.reply('Ошибка при обновлении: ' + e.message)
    }
    return ctx.scene.leave()
  }
)

// собрать Stage со всеми сценами
function buildStage() {
  return new Scenes.Stage([addWizard, deleteWizard, editWizard])
}

// зарегистрировать команды бота
function registerCommands(bot) {
  // /start - приветствие и список команд
  bot.start(async (ctx) => {
    const name = ctx.from.first_name || 'друг'
    await ctx.reply(
      `Привет, ${name}! 👋\n\n` +
        'Я бот для учёта личных финансов.\n\n' +
        'Доступные команды:\n' +
        '/add - добавить транзакцию\n' +
        '/list - список транзакций\n' +
        '/stats - статистика\n' +
        '/delete - удалить транзакцию\n' +
        '/edit - редактировать транзакцию'
    )
  })

  // команды, открывающие сцены
  bot.command('add', (ctx) => ctx.scene.enter('add-wizard'))
  bot.command('delete', (ctx) => ctx.scene.enter('delete-wizard'))
  bot.command('edit', (ctx) => ctx.scene.enter('edit-wizard'))

  // /list - вывод всех транзакций пользователя
  bot.command('list', async (ctx) => {
    try {
      const rows = await tx.listTransactions(ctx.from.id)
      if (!rows.length) {
        return ctx.reply('Транзакций пока нет.')
      }
      await ctx.reply(rows.map(tx.formatLine).join('\n'))
    } catch (e) {
      await ctx.reply('Ошибка: ' + e.message)
    }
  })

  // /stats - сводная статистика
  bot.command('stats', async (ctx) => {
    try {
      const s = await tx.getStats(ctx.from.id)
      let text = '📊 Статистика\n\n'
      text += `Доходы: ${s.income.toFixed(2)} ₽\n`
      text += `Расходы: ${s.expense.toFixed(2)} ₽\n`
      text += `Баланс: ${s.balance.toFixed(2)} ₽\n`
      const cats = Object.keys(s.byCategory)
      if (cats.length) {
        text += '\nРасходы по категориям:\n'
        for (const c of cats) {
          text += `  ${c}: ${s.byCategory[c].toFixed(2)} ₽\n`
        }
      }
      await ctx.reply(text)
    } catch (e) {
      await ctx.reply('Ошибка: ' + e.message)
    }
  })
}

module.exports = { buildStage, registerCommands }
